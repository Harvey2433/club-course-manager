use serde::{Deserialize, Serialize};

/// 用户角色
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Role {
    Admin,
    Teacher,
    Student,
}

/// 用户
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: u64,
    pub username: String,
    pub password_hash: String,
    pub role: Role,
}

/// 课程
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Course {
    pub id: u64,
    pub name: String,
    pub teacher_name: String,
    pub description: String,
}

/// 选课记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enrollment {
    pub id: u64,
    pub student_id: u64,
    pub course_id: u64,
}

/// 过程记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessRecord {
    pub id: u64,
    pub course_id: u64,
    pub student_id: u64,
    pub content: String,
    pub timestamp: u64,
}

/// 课程作品
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseWork {
    pub id: u64,
    pub course_id: u64,
    pub student_id: u64,
    pub description: String,
    pub file_path: Option<String>,
    pub grade: Option<f32>,
    pub comment: Option<String>,
}

impl User {
    pub fn is_admin(&self) -> bool {
        matches!(self.role, Role::Admin)
    }

    pub fn is_teacher_or_admin(&self) -> bool {
        matches!(self.role, Role::Teacher | Role::Admin)
    }
}