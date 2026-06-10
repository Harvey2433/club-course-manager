use crate::db::{new_id, now_millis, DbPool};
use crate::models::*;
use crate::repo;
use crate::security;
use uuid::Uuid;

/// session 有效期：24 小时（毫秒）
const SESSION_TTL_MS: i64 = 24 * 60 * 60 * 1000;

const BUILTIN_ADMIN_USERNAME: &str = "admin";

/// 首次启动时确保内置管理员存在。
/// 密码优先取自环境变量 CLUB_ADMIN_PASSWORD；未设置时生成一次性随机密码，
/// 并通过 WinAPI MessageBox 展示给用户。已存在 admin 时不再重复展示。
pub fn ensure_builtin_admin(pool: &DbPool) -> Result<(), String> {
    let normalized = security::normalize_username(BUILTIN_ADMIN_USERNAME);
    if repo::find_user_by_normalized(pool, &normalized)?.is_some() {
        return Ok(());
    }

    let password = std::env::var("CLUB_ADMIN_PASSWORD").unwrap_or_else(|_| {
        let generated = Uuid::new_v4().to_string().replace('-', "");
        format!("Adm{}", &generated[..12])
    });

    let now = now_millis();
    let password_hash = security::hash_password(&password)?;

    let admin = StoredUser {
        id: new_id(),
        username: BUILTIN_ADMIN_USERNAME.to_string(),
        username_normalized: normalized,
        display_name: "系统管理员".to_string(),
        bio: "内置管理员账户，可全局管理课程、社团、选课记录与用户信息。".to_string(),
        avatar: None,
        role: Role::Admin,
        enterprise_email: String::new(),
        password_hash,
        managed_club_ids: Vec::new(),
        created_at: now,
        updated_at: now,
    };

    repo::insert_user(pool, &admin)?;

    #[cfg(windows)]
    show_admin_password_dialog(&password);

    Ok(())
}

#[cfg(windows)]
fn show_admin_password_dialog(password: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let text = format!(
        "管理员账户已自动创建。\n\n用户名: admin\n初始密码: {password}\n\n请妥善保存密码，登录后尽快在个人中心修改。\n此窗口仅出现一次.",
    );
    let caption = "系统初始化 - 管理员密码";

    let text_wide: Vec<u16> = OsStr::new(&text).encode_wide().chain(Some(0)).collect();
    let caption_wide: Vec<u16> = OsStr::new(&caption).encode_wide().chain(Some(0)).collect();

    unsafe {
        MessageBoxW(
            0, // NULL hwnd，弹在桌面上
            text_wide.as_ptr(),
            caption_wide.as_ptr(),
            MB_OK | MB_ICONINFORMATION,
        );
    }
}

#[cfg(windows)]
#[link(name = "user32")]
extern "system" {
    fn MessageBoxW(hWnd: isize, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
}

#[cfg(windows)]
const MB_OK: u32 = 0x00000000;
#[cfg(windows)]
const MB_ICONINFORMATION: u32 = 0x00000040;

fn create_session(pool: &DbPool, user_id: &str) -> Result<String, String> {
    let token = Uuid::new_v4().to_string();
    let now = now_millis();
    repo::insert_session(pool, &token, user_id, now, now + SESSION_TTL_MS)?;
    Ok(token)
}

/// 通过 token 取当前已登录用户，自动校验过期
pub fn require_user(pool: &DbPool, token: &str) -> Result<StoredUser, String> {
    let now = now_millis();
    let _ = repo::delete_expired_sessions(pool, now);

    let user_id = repo::find_session_user_id(pool, token, now)?
        .ok_or_else(|| "登录状态已失效，请重新登录".to_string())?;

    repo::find_user_by_id(pool, &user_id)?.ok_or_else(|| {
        let _ = repo::delete_session(pool, token);
        "用户不存在".to_string()
    })
}

pub fn register(pool: &DbPool, username: &str, display_name: &str, password: &str) -> Result<AuthResult, String> {
    let username = security::sanitize_username(username);
    let display_name = security::sanitize_display_name(display_name);
    let password = password.to_string();

    security::validate_username(&username)?;
    security::validate_display_name(&display_name)?;
    security::validate_password(&password)?;

    let normalized = security::normalize_username(&username);
    if repo::find_user_by_normalized(pool, &normalized)?.is_some() {
        return Err("该用户名已被注册，请更换其他用户名".into());
    }

    let now = now_millis();
    let password_hash = security::hash_password(&password)?;

    let user = StoredUser {
        id: new_id(),
        username,
        username_normalized: normalized,
        display_name,
        bio: security::default_bio(),
        avatar: None,
        role: Role::Student,
        enterprise_email: String::new(),
        password_hash,
        managed_club_ids: Vec::new(),
        created_at: now,
        updated_at: now,
    };

    repo::insert_user(pool, &user)?;
    let token = create_session(pool, &user.id)?;

    Ok(AuthResult {
        token,
        user: user.to_public(),
    })
}

pub fn login(pool: &DbPool, username: &str, password: &str) -> Result<AuthResult, String> {
    let username = security::sanitize_username(username);
    security::validate_username(&username)?;
    if password.is_empty() {
        return Err("请输入密码".into());
    }

    let normalized = security::normalize_username(&username);
    let user = repo::find_user_by_normalized(pool, &normalized)?
        .ok_or_else(|| "用户名或密码错误".to_string())?;

    if !security::verify_password(password, &user.password_hash) {
        return Err("用户名或密码错误".into());
    }

    let token = create_session(pool, &user.id)?;
    Ok(AuthResult {
        token,
        user: user.to_public(),
    })
}

pub fn logout(pool: &DbPool, token: &str) -> Result<(), String> {
    repo::delete_session(pool, token)
}

pub fn change_password(pool: &DbPool, token: &str, current_password: &str, next_password: &str) -> Result<PublicUser, String> {
    let mut user = require_user(pool, token)?;

    if current_password.is_empty() {
        return Err("请输入当前密码".into());
    }
    security::validate_password(next_password)?;

    if !security::verify_password(current_password, &user.password_hash) {
        return Err("当前密码错误".into());
    }
    if current_password == next_password {
        return Err("新密码不能与当前密码相同".into());
    }

    user.password_hash = security::hash_password(next_password)?;
    user.updated_at = now_millis();
    repo::update_user(pool, &user)?;
    Ok(user.to_public())
}