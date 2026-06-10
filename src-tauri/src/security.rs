use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;

/// 使用 Argon2 对密码进行加盐哈希
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| format!("密码哈希失败: {e}"))
}

/// 校验密码是否与存储的哈希匹配
pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    let parsed = match PasswordHash::new(stored_hash) {
        Ok(value) => value,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

fn strip_control_chars(value: &str) -> String {
    value
        .chars()
        .filter(|c| {
            let code = *c as u32;
            !((code <= 0x08)
                || code == 0x0B
                || code == 0x0C
                || (0x0E..=0x1F).contains(&code)
                || code == 0x7F)
        })
        .collect()
}

pub fn sanitize_username(value: &str) -> String {
    strip_control_chars(value)
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .trim()
        .to_string()
}

pub fn normalize_username(value: &str) -> String {
    sanitize_username(value).to_lowercase()
}

pub fn sanitize_display_name(value: &str) -> String {
    strip_control_chars(value).trim().to_string()
}

pub fn sanitize_bio(value: &str) -> String {
    strip_control_chars(value).trim().to_string()
}

pub fn sanitize_email(value: &str) -> String {
    strip_control_chars(value).trim().to_lowercase()
}

const DEFAULT_BIO: &str = "这地真寒酸啊，啥都木有";
const MAX_BIO_LEN: usize = 120;
const MAX_EMAIL_LEN: usize = 80;

/// 用户名校验
pub fn validate_username(value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err("请输入用户名".into());
    }
    let len = value.chars().count();
    if len < 2 || len > 20 {
        return Err("用户名长度需为2到20位".into());
    }
    let valid = value.chars().all(|c| {
        c.is_alphanumeric() || matches!(c, '_' | '-' | '.' | '@')
    });
    if !valid {
        return Err("用户名仅支持中文、字母、数字以及 _ - . @".into());
    }
    Ok(())
}

/// 显示名校验
pub fn validate_display_name(value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err("请输入显示名称".into());
    }
    let len = value.chars().count();
    if len < 2 || len > 24 {
        return Err("显示名称长度需为2到24位".into());
    }
    Ok(())
}

/// 简介校验
pub fn validate_bio(value: &str) -> Result<(), String> {
    if value.chars().count() > MAX_BIO_LEN {
        return Err(format!("个人简介不能超过 {MAX_BIO_LEN} 个字符"));
    }
    Ok(())
}

/// 密码强度校验
pub fn validate_password(value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err("请输入密码".into());
    }
    let len = value.chars().count();
    if len < 8 || len > 32 {
        return Err("密码长度需为8到32位".into());
    }
    let has_letter = value.chars().any(|c| c.is_ascii_alphabetic());
    let has_digit = value.chars().any(|c| c.is_ascii_digit());
    if !has_letter || !has_digit {
        return Err("密码至少需要包含一个字母和一个数字".into());
    }
    Ok(())
}

fn is_valid_email(value: &str) -> bool {
    let parts: Vec<&str> = value.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    let (local, domain) = (parts[0], parts[1]);
    if local.is_empty() || domain.is_empty() {
        return false;
    }
    domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
}

/// 企业邮箱校验（教师必填）
pub fn validate_enterprise_email(value: &str, role: crate::models::Role) -> Result<(), String> {
    use crate::models::Role;
    if role == Role::Teacher {
        if value.is_empty() {
            return Err("教师权限需要填写企业邮箱".into());
        }
    } else if value.is_empty() {
        return Ok(());
    }

    if value.chars().count() > MAX_EMAIL_LEN {
        return Err(format!("邮箱长度不能超过 {MAX_EMAIL_LEN} 个字符"));
    }
    if !is_valid_email(value) {
        return Err("请输入有效的邮箱地址".into());
    }
    Ok(())
}

pub fn default_bio() -> String {
    DEFAULT_BIO.to_string()
}

const ALLOWED_AVATAR_PREFIXES: [&str; 4] = [
    "data:image/jpeg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
    "data:image/gif;base64,",
];

const MAX_AVATAR_LEN: usize = 1024 * 1024;
const MAX_ATTACHMENT_LEN: usize = 8 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME: [&str; 8] = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/zip",
    "application/octet-stream",
];

/// 校验头像 data URL，None 表示不修改，Some(None) 表示清空
pub fn normalize_avatar(value: Option<String>) -> Result<Option<Option<String>>, String> {
    match value {
        None => Ok(None),
        Some(v) => {
            if v.is_empty() {
                return Ok(Some(None));
            }
            if !ALLOWED_AVATAR_PREFIXES.iter().any(|p| v.starts_with(p)) {
                return Err("头像数据格式不受支持".into());
            }
            if v.len() > MAX_AVATAR_LEN {
                return Err("头像数据过大，请重新选择图片".into());
            }
            Ok(Some(Some(v)))
        }
    }
}

/// 校验课程成果附件
pub fn validate_attachment(mime_type: &str, data_url: &str) -> Result<(), String> {
    if !data_url.starts_with("data:") {
        return Err("上传文件数据无效".into());
    }
    if data_url.len() > MAX_ATTACHMENT_LEN {
        return Err("文件过大，请选择更小的文件".into());
    }
    if !ALLOWED_ATTACHMENT_MIME.contains(&mime_type) {
        return Err("不支持的文件类型".into());
    }
    Ok(())
}