use crate::db::{new_id, now_millis, DbPool};
use crate::models::*;
use crate::repo;
use crate::security;
use std::collections::HashMap;

fn assert_text(value: &str, label: &str, min: usize, max: usize) -> Result<String, String> {
    let text = value.trim().to_string();
    let len = text.chars().count();
    if len < min {
        return Err(format!("{label}不能为空"));
    }
    if len > max {
        return Err(format!("{label}长度不能超过{max}个字符"));
    }
    Ok(text)
}

fn can_manage_club(user: &StoredUser, club_id: &str) -> bool {
    match user.role {
        Role::Admin => true,
        Role::Teacher => user.managed_club_ids.iter().any(|id| id == club_id),
        Role::Student => false,
    }
}

fn ensure_manage_club(user: &StoredUser, club_id: &str) -> Result<(), String> {
    if can_manage_club(user, club_id) {
        Ok(())
    } else {
        Err("当前用户无权管理该社团或课程".into())
    }
}

// ---------- 社团 ----------

pub fn list_clubs(pool: &DbPool, _user: &StoredUser) -> Result<Vec<Club>, String> {
    repo::list_clubs(pool)
}

pub fn create_club(pool: &DbPool, user: &StoredUser, name: &str, description: &str) -> Result<Club, String> {
    if !user.is_admin() {
        return Err("仅管理员可创建社团".into());
    }
    let name = assert_text(name, "社团名称", 1, 40)?;
    let description = assert_text(description, "社团简介", 0, 200).unwrap_or_default();

    if repo::club_name_exists(pool, &name, None)? {
        return Err("社团名称已存在".into());
    }

    let now = now_millis();
    let club = Club {
        id: new_id(),
        name,
        description,
        created_at: now,
        updated_at: now,
    };
    repo::insert_club(pool, &club)?;
    Ok(club)
}

pub fn update_club(pool: &DbPool, user: &StoredUser, id: &str, name: &str, description: &str) -> Result<Club, String> {
    let mut club = repo::find_club(pool, id)?.ok_or_else(|| "社团不存在".to_string())?;
    ensure_manage_club(user, &club.id)?;

    let name = assert_text(name, "社团名称", 1, 40)?;
    let description = assert_text(description, "社团简介", 0, 200).unwrap_or_default();

    if repo::club_name_exists(pool, &name, Some(&club.id))? {
        return Err("社团名称已存在".into());
    }

    club.name = name;
    club.description = description;
    club.updated_at = now_millis();
    repo::update_club(pool, &club)?;
    Ok(club)
}

pub fn delete_club(pool: &DbPool, user: &StoredUser, id: &str) -> Result<(), String> {
    if !user.is_admin() {
        return Err("仅管理员可删除社团".into());
    }
    if repo::find_club(pool, id)?.is_none() {
        return Err("社团不存在".into());
    }
    repo::delete_club(pool, id)
}

// ---------- 课程 ----------

pub fn list_courses(pool: &DbPool, _user: &StoredUser) -> Result<Vec<Course>, String> {
    repo::list_courses(pool)
}

pub fn create_course(pool: &DbPool, user: &StoredUser, club_id: &str, name: &str, teacher_name: &str, description: &str) -> Result<Course, String> {
    ensure_manage_club(user, club_id)?;
    if repo::find_club(pool, club_id)?.is_none() {
        return Err("所属社团不存在".into());
    }

    let name = assert_text(name, "课程名称", 1, 50)?;
    let teacher_name = assert_text(teacher_name, "授课老师", 1, 30)?;
    let description = assert_text(description, "课程简介", 0, 200).unwrap_or_default();

    if repo::course_name_exists_in_club(pool, club_id, &name, None)? {
        return Err("该社团下已存在同名课程".into());
    }

    let now = now_millis();
    let course = Course {
        id: new_id(),
        club_id: club_id.to_string(),
        name,
        teacher_name,
        description,
        result_attachment: None,
        created_at: now,
        updated_at: now,
    };
    repo::insert_course(pool, &course)?;
    Ok(course)
}

pub fn update_course(pool: &DbPool, user: &StoredUser, id: &str, club_id: &str, name: &str, teacher_name: &str, description: &str) -> Result<Course, String> {
    let mut course = repo::find_course(pool, id)?.ok_or_else(|| "课程不存在".to_string())?;
    ensure_manage_club(user, &course.club_id)?;
    ensure_manage_club(user, club_id)?;

    if repo::find_club(pool, club_id)?.is_none() {
        return Err("所属社团不存在".into());
    }

    let name = assert_text(name, "课程名称", 1, 50)?;
    let teacher_name = assert_text(teacher_name, "授课老师", 1, 30)?;
    let description = assert_text(description, "课程简介", 0, 200).unwrap_or_default();

    if repo::course_name_exists_in_club(pool, club_id, &name, Some(id))? {
        return Err("该社团下已存在同名课程".into());
    }

    course.club_id = club_id.to_string();
    course.name = name;
    course.teacher_name = teacher_name;
    course.description = description;
    course.updated_at = now_millis();
    repo::update_course(pool, &course)?;
    Ok(course)
}

pub fn delete_course(pool: &DbPool, user: &StoredUser, id: &str) -> Result<(), String> {
    let course = repo::find_course(pool, id)?.ok_or_else(|| "课程不存在".to_string())?;
    ensure_manage_club(user, &course.club_id)?;
    repo::delete_course(pool, id)
}

pub fn upload_course_result(pool: &DbPool, user: &StoredUser, course_id: &str, file_name: &str, mime_type: &str, data_url: &str) -> Result<Course, String> {
    let mut course = repo::find_course(pool, course_id)?.ok_or_else(|| "课程不存在".to_string())?;
    ensure_manage_club(user, &course.club_id)?;

    let file_name = assert_text(file_name, "文件名", 1, 120)?;
    let mime_type = mime_type.trim().to_string();
    let data_url = data_url.trim().to_string();
    security::validate_attachment(&mime_type, &data_url)?;

    course.result_attachment = Some(CourseResultAttachment {
        file_name,
        mime_type,
        data_url,
        uploaded_at: now_millis(),
    });
    course.updated_at = now_millis();
    repo::update_course(pool, &course)?;
    Ok(course)
}

pub fn remove_course_result(pool: &DbPool, user: &StoredUser, course_id: &str) -> Result<Course, String> {
    let mut course = repo::find_course(pool, course_id)?.ok_or_else(|| "课程不存在".to_string())?;
    ensure_manage_club(user, &course.club_id)?;

    course.result_attachment = None;
    course.updated_at = now_millis();
    repo::update_course(pool, &course)?;
    Ok(course)
}

// ---------- 选课 ----------

pub fn enroll(pool: &DbPool, user: &StoredUser, course_id: &str, target_student_id: Option<&str>) -> Result<Enrollment, String> {
    let student_id = match target_student_id {
        Some(id) if !id.is_empty() => id.to_string(),
        _ => user.id.clone(),
    };

    match user.role {
        Role::Student => {
            if student_id != user.id {
                return Err("学生仅可为自己选课".into());
            }
        }
        Role::Admin => {}
        Role::Teacher => return Err("教师账户没有选课权限".into()),
    }

    let student = repo::find_user_by_id(pool, &student_id)?.ok_or_else(|| "目标学生不存在".to_string())?;
    if student.role != Role::Student {
        return Err("仅学生账户可以产生选课记录".into());
    }

    if repo::find_course(pool, course_id)?.is_none() {
        return Err("课程不存在".into());
    }

    if repo::enrollment_exists(pool, course_id, &student_id)? {
        return Err("你已选择该课程，请勿重复选课".into());
    }

    let enrollment = Enrollment {
        id: new_id(),
        course_id: course_id.to_string(),
        student_user_id: student_id,
        created_at: now_millis(),
    };
    repo::insert_enrollment(pool, &enrollment)?;
    Ok(enrollment)
}

/// 构建对当前用户可见的选课视图：管理员看全部，教师看自己管辖社团，学生看自己
pub fn visible_enrollment_views(pool: &DbPool, user: &StoredUser) -> Result<Vec<EnrollmentView>, String> {
    let enrollments = repo::list_enrollments(pool)?;
    let courses = repo::list_courses(pool)?;
    let clubs = repo::list_clubs(pool)?;
    let users = repo::list_users(pool)?;

    let course_map: HashMap<String, &Course> = courses.iter().map(|c| (c.id.clone(), c)).collect();
    let club_map: HashMap<String, &Club> = clubs.iter().map(|c| (c.id.clone(), c)).collect();
    let user_map: HashMap<String, &StoredUser> = users.iter().map(|u| (u.id.clone(), u)).collect();

    let mut views = Vec::new();
    for record in enrollments {
        let course = course_map.get(&record.course_id);

        let visible = match user.role {
            Role::Admin => true,
            Role::Student => record.student_user_id == user.id,
            Role::Teacher => course
                .map(|c| user.managed_club_ids.iter().any(|id| id == &c.club_id))
                .unwrap_or(false),
        };
        if !visible {
            continue;
        }

        let student = user_map.get(&record.student_user_id);
        let club = course.and_then(|c| club_map.get(&c.club_id));

        views.push(EnrollmentView {
            id: record.id,
            student_user_id: record.student_user_id.clone(),
            student_display_name: student.map(|s| s.display_name.clone()).unwrap_or_else(|| "未知用户".into()),
            student_username: student.map(|s| s.username.clone()).unwrap_or_else(|| "unknown".into()),
            student_role: student.map(|s| s.role).unwrap_or(Role::Student),
            course_id: record.course_id.clone(),
            course_name: course.map(|c| c.name.clone()).unwrap_or_else(|| "未知课程".into()),
            club_name: club.map(|c| c.name.clone()).unwrap_or_else(|| "未知社团".into()),
            teacher_name: course.map(|c| c.teacher_name.clone()).unwrap_or_else(|| "未知教师".into()),
            created_at: record.created_at,
        });
    }

    views.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(views)
}

/// 排行榜：基于当前用户可见的选课视图统计
pub fn ranking_entries(pool: &DbPool, user: &StoredUser) -> Result<Vec<RankingEntry>, String> {
    let views = visible_enrollment_views(pool, user)?;
    let users = repo::list_users(pool)?;
    let user_map: HashMap<String, &StoredUser> = users.iter().map(|u| (u.id.clone(), u)).collect();

    let mut counts: HashMap<String, u64> = HashMap::new();
    for view in &views {
        *counts.entry(view.student_user_id.clone()).or_insert(0) += 1;
    }

    let mut entries: Vec<RankingEntry> = counts
        .into_iter()
        .filter_map(|(uid, count)| {
            user_map.get(&uid).map(|u| RankingEntry {
                user_id: u.id.clone(),
                username: u.username.clone(),
                display_name: u.display_name.clone(),
                role: u.role,
                enrolled_count: count,
            })
        })
        .collect();

    entries.sort_by(|a, b| {
        b.enrolled_count
            .cmp(&a.enrolled_count)
            .then_with(|| a.username.cmp(&b.username))
    });
    Ok(entries)
}

// ---------- 个人资料 ----------

pub fn update_profile(pool: &DbPool, user: &StoredUser, display_name: &str, bio: &str, enterprise_email: &str, avatar: Option<String>) -> Result<PublicUser, String> {
    let display_name = security::sanitize_display_name(display_name);
    let bio_in = security::sanitize_bio(bio);
    let bio = if bio_in.is_empty() { security::default_bio() } else { bio_in };
    let enterprise_email = security::sanitize_email(enterprise_email);

    security::validate_display_name(&display_name)?;
    security::validate_bio(&bio)?;
    security::validate_enterprise_email(&enterprise_email, user.role)?;

    let avatar_change = security::normalize_avatar(avatar)?;

    let mut updated = user.clone();
    updated.display_name = display_name;
    updated.bio = bio;
    updated.enterprise_email = enterprise_email;
    if let Some(next_avatar) = avatar_change {
        updated.avatar = next_avatar;
    }
    updated.updated_at = now_millis();

    repo::update_user(pool, &updated)?;
    Ok(updated.to_public())
}

// ---------- 管理员管理用户 ----------

pub fn list_accounts(pool: &DbPool, user: &StoredUser) -> Result<Vec<PublicUser>, String> {
    if !user.is_admin() {
        return Err("仅管理员可执行该操作".into());
    }
    let users = repo::list_users(pool)?;
    Ok(users.iter().map(|u| u.to_public()).collect())
}

#[allow(clippy::too_many_arguments)]
pub fn admin_update_account(
    pool: &DbPool,
    user: &StoredUser,
    target_id: &str,
    display_name: &str,
    bio: &str,
    role: Role,
    enterprise_email: &str,
    managed_club_ids: &[String],
    avatar: Option<String>,
) -> Result<PublicUser, String> {
    if !user.is_admin() {
        return Err("仅管理员可执行该操作".into());
    }

    let mut target = repo::find_user_by_id(pool, target_id)?.ok_or_else(|| "目标用户不存在".to_string())?;

    let display_name = security::sanitize_display_name(display_name);
    let bio_in = security::sanitize_bio(bio);
    let bio = if bio_in.is_empty() { security::default_bio() } else { bio_in };

    // 内置管理员账户角色不可降级
    let builtin_normalized = security::normalize_username("admin");
    let next_role = if target.username_normalized == builtin_normalized {
        Role::Admin
    } else {
        role
    };

    let enterprise_email = if next_role == Role::Teacher {
        security::sanitize_email(enterprise_email)
    } else {
        String::new()
    };

    security::validate_display_name(&display_name)?;
    security::validate_bio(&bio)?;
    security::validate_enterprise_email(&enterprise_email, next_role)?;

    let mut managed: Vec<String> = if next_role == Role::Teacher {
        let mut seen = std::collections::HashSet::new();
        managed_club_ids
            .iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && seen.insert(s.clone()))
            .collect()
    } else {
        Vec::new()
    };
    managed.sort();

    let avatar_change = security::normalize_avatar(avatar)?;

    target.display_name = display_name;
    target.bio = bio;
    target.role = next_role;
    target.enterprise_email = enterprise_email;
    target.managed_club_ids = managed;
    if let Some(next_avatar) = avatar_change {
        target.avatar = next_avatar;
    }
    target.updated_at = now_millis();

    repo::update_user(pool, &target)?;
    Ok(target.to_public())
}

/// 首次启动时若没有任何社团/课程，写入演示数据
pub fn ensure_seed_data(pool: &DbPool) -> Result<(), String> {
    if !repo::list_clubs(pool)?.is_empty() {
        return Ok(());
    }

    let now = now_millis();
    let coding = Club {
        id: new_id(),
        name: "编程社".into(),
        description: "聚焦前端、后端、算法与工程实践。".into(),
        created_at: now,
        updated_at: now,
    };
    let photo = Club {
        id: new_id(),
        name: "摄影社".into(),
        description: "学习构图、后期与活动纪实拍摄。".into(),
        created_at: now + 1,
        updated_at: now + 1,
    };
    repo::insert_club(pool, &coding)?;
    repo::insert_club(pool, &photo)?;

    let course_a = Course {
        id: new_id(),
        club_id: coding.id.clone(),
        name: "Vue 实战入门".into(),
        teacher_name: "系统示例教师".into(),
        description: "从组件、路由到状态管理的完整入门课程。".into(),
        result_attachment: None,
        created_at: now + 2,
        updated_at: now + 2,
    };
    let course_b = Course {
        id: new_id(),
        club_id: photo.id.clone(),
        name: "校园摄影基础".into(),
        teacher_name: "系统示例教师".into(),
        description: "掌握构图、光线与活动记录拍摄技巧。".into(),
        result_attachment: None,
        created_at: now + 3,
        updated_at: now + 3,
    };
    repo::insert_course(pool, &course_a)?;
    repo::insert_course(pool, &course_b)?;

    Ok(())
}