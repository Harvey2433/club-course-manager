use crate::auth;
use crate::db::DbPool;
use crate::models::*;
use crate::services;
use tauri::State;

// ---------- 认证 ----------

#[tauri::command]
pub fn register(db: State<DbPool>, username: String, display_name: String, password: String) -> Result<AuthResult, String> {
    auth::register(db.inner(), &username, &display_name, &password)
}

#[tauri::command]
pub fn login(db: State<DbPool>, username: String, password: String) -> Result<AuthResult, String> {
    auth::login(db.inner(), &username, &password)
}

#[tauri::command]
pub fn logout(db: State<DbPool>, token: String) -> Result<(), String> {
    auth::logout(db.inner(), &token)
}

#[tauri::command]
pub fn current_user(db: State<DbPool>, token: String) -> Result<Option<PublicUser>, String> {
    match auth::require_user(db.inner(), &token) {
        Ok(user) => Ok(Some(user.to_public())),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn change_password(db: State<DbPool>, token: String, current_password: String, next_password: String) -> Result<PublicUser, String> {
    auth::change_password(db.inner(), &token, &current_password, &next_password)
}

#[tauri::command]
pub fn update_profile(db: State<DbPool>, token: String, display_name: String, bio: String, enterprise_email: String, avatar: Option<String>) -> Result<PublicUser, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::update_profile(db.inner(), &user, &display_name, &bio, &enterprise_email, avatar)
}

// ---------- 管理员管理用户 ----------

#[tauri::command]
pub fn list_accounts(db: State<DbPool>, token: String) -> Result<Vec<PublicUser>, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::list_accounts(db.inner(), &user)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn admin_update_account(
    db: State<DbPool>,
    token: String,
    user_id: String,
    display_name: String,
    bio: String,
    role: Role,
    enterprise_email: String,
    managed_club_ids: Vec<String>,
    avatar: Option<String>,
) -> Result<PublicUser, String> {
    let actor = auth::require_user(db.inner(), &token)?;
    services::admin_update_account(
        db.inner(),
        &actor,
        &user_id,
        &display_name,
        &bio,
        role,
        &enterprise_email,
        &managed_club_ids,
        avatar,
    )
}

// ---------- 社团 ----------

#[tauri::command]
pub fn list_clubs(db: State<DbPool>, token: String) -> Result<Vec<Club>, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::list_clubs(db.inner(), &user)
}

#[tauri::command]
pub fn create_club(db: State<DbPool>, token: String, name: String, description: String) -> Result<Club, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::create_club(db.inner(), &user, &name, &description)
}

#[tauri::command]
pub fn update_club(db: State<DbPool>, token: String, id: String, name: String, description: String) -> Result<Club, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::update_club(db.inner(), &user, &id, &name, &description)
}

#[tauri::command]
pub fn delete_club(db: State<DbPool>, token: String, id: String) -> Result<(), String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::delete_club(db.inner(), &user, &id)
}

// ---------- 课程 ----------

#[tauri::command]
pub fn list_courses(db: State<DbPool>, token: String) -> Result<Vec<Course>, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::list_courses(db.inner(), &user)
}

#[tauri::command]
pub fn create_course(db: State<DbPool>, token: String, club_id: String, name: String, teacher_name: String, description: String) -> Result<Course, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::create_course(db.inner(), &user, &club_id, &name, &teacher_name, &description)
}

#[tauri::command]
pub fn update_course(db: State<DbPool>, token: String, id: String, club_id: String, name: String, teacher_name: String, description: String) -> Result<Course, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::update_course(db.inner(), &user, &id, &club_id, &name, &teacher_name, &description)
}

#[tauri::command]
pub fn delete_course(db: State<DbPool>, token: String, id: String) -> Result<(), String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::delete_course(db.inner(), &user, &id)
}

#[tauri::command]
pub fn upload_course_result(db: State<DbPool>, token: String, course_id: String, file_name: String, mime_type: String, data_url: String) -> Result<Course, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::upload_course_result(db.inner(), &user, &course_id, &file_name, &mime_type, &data_url)
}

#[tauri::command]
pub fn remove_course_result(db: State<DbPool>, token: String, course_id: String) -> Result<Course, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::remove_course_result(db.inner(), &user, &course_id)
}

// ---------- 选课 ----------

#[tauri::command]
pub fn enroll_course(db: State<DbPool>, token: String, course_id: String, student_id: Option<String>) -> Result<Enrollment, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::enroll(db.inner(), &user, &course_id, student_id.as_deref())
}

#[tauri::command]
pub fn list_enrollment_views(db: State<DbPool>, token: String) -> Result<Vec<EnrollmentView>, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::visible_enrollment_views(db.inner(), &user)
}

#[tauri::command]
pub fn list_ranking(db: State<DbPool>, token: String) -> Result<Vec<RankingEntry>, String> {
    let user = auth::require_user(db.inner(), &token)?;
    services::ranking_entries(db.inner(), &user)
}