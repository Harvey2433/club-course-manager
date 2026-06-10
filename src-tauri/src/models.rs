use serde::{Deserialize, Serialize};

/// 用户角色
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin,
    Teacher,
    Student,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Teacher => "teacher",
            Role::Student => "student",
        }
    }

    pub fn from_str(value: &str) -> Role {
        match value {
            "admin" => Role::Admin,
            "teacher" => Role::Teacher,
            _ => Role::Student,
        }
    }
}

/// 对外暴露的公开用户信息（不含密码哈希与盐）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub avatar: Option<String>,
    pub role: Role,
    pub enterprise_email: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub managed_club_ids: Vec<String>,
}

/// 数据库内部存储的完整用户记录
#[derive(Debug, Clone)]
pub struct StoredUser {
    pub id: String,
    pub username: String,
    pub username_normalized: String,
    pub display_name: String,
    pub bio: String,
    pub avatar: Option<String>,
    pub role: Role,
    pub enterprise_email: String,
    pub password_hash: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub managed_club_ids: Vec<String>,
}

impl StoredUser {
    pub fn to_public(&self) -> PublicUser {
        PublicUser {
            id: self.id.clone(),
            username: self.username.clone(),
            display_name: self.display_name.clone(),
            bio: self.bio.clone(),
            avatar: self.avatar.clone(),
            role: self.role,
            enterprise_email: self.enterprise_email.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
            managed_club_ids: self.managed_club_ids.clone(),
        }
    }

    pub fn is_admin(&self) -> bool {
        self.role == Role::Admin
    }

    pub fn is_teacher(&self) -> bool {
        self.role == Role::Teacher
    }
}

/// 社团
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Club {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 课程成果附件
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseResultAttachment {
    pub file_name: String,
    pub mime_type: String,
    pub data_url: String,
    pub uploaded_at: i64,
}

/// 课程
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub id: String,
    pub club_id: String,
    pub name: String,
    pub teacher_name: String,
    pub description: String,
    pub result_attachment: Option<CourseResultAttachment>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 选课记录
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Enrollment {
    pub id: String,
    pub course_id: String,
    pub student_user_id: String,
    pub created_at: i64,
}

/// 选课记录视图（含关联展示信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrollmentView {
    pub id: String,
    pub student_user_id: String,
    pub student_display_name: String,
    pub student_username: String,
    pub student_role: Role,
    pub course_id: String,
    pub course_name: String,
    pub club_name: String,
    pub teacher_name: String,
    pub created_at: i64,
}

/// 排行榜条目
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankingEntry {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub role: Role,
    pub enrolled_count: u64,
}

/// 登录成功返回
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResult {
    pub token: String,
    pub user: PublicUser,
}