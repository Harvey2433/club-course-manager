use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::sync::RwLock;
use uuid::Uuid;
use crate::models::{User, Role};

pub struct SessionManager {
    pub sessions: RwLock<HashMap<String, u64>>, // token -> user_id
}

impl SessionManager {
    pub fn new() -> Self {
        Self { sessions: RwLock::new(HashMap::new()) }
    }

    pub fn get_user_id(&self, token: &str) -> Option<u64> {
        self.sessions.read().unwrap().get(token).copied()
    }

    fn create_session(&self, user_id: u64) -> String {
        let token = Uuid::new_v4().to_string();
        self.sessions.write().unwrap().insert(token.clone(), user_id);
        token
    }
}

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

/// 初始化默认账户（admin, teacher, student）
pub fn init_users(db: &mut impl crate::db_trait::UserRepo) -> Result<(), String> {
    db.add_user(User {
        id: 0, // 将被覆盖
        username: "admin".into(),
        password_hash: hash_password("admin123"),
        role: Role::Admin,
    })?;
    db.add_user(User {
        id: 0,
        username: "teacher".into(),
        password_hash: hash_password("teacher123"),
        role: Role::Teacher,
    })?;
    db.add_user(User {
        id: 0,
        username: "student".into(),
        password_hash: hash_password("student123"),
        role: Role::Student,
    })?;
    Ok(())
}

/// 登录验证，返回用户信息和token
pub fn login(
    user_repo: &impl crate::db_trait::UserRepo,
    username: &str,
    password: &str,
    sessions: &SessionManager,
) -> Result<(User, String), String> {
    let user = user_repo.find_by_username(username)
        .ok_or_else(|| "用户名不存在".to_string())?;
    if user.password_hash != hash_password(password) {
        return Err("密码错误".into());
    }
    let token = sessions.create_session(user.id);
    Ok((user, token))
}

/// 通过token获取当前用户
pub fn get_user_by_token(
    db: &impl crate::db_trait::UserRepo,
    sessions: &SessionManager,
    token: &str,
) -> Result<User, String> {
    let user_id = sessions.get_user_id(token)
        .ok_or_else(|| "无效的会话token".to_string())?;
    db.find_by_id(user_id)
        .ok_or_else(|| "用户不存在".to_string())
}