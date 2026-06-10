use crate::models::*;
use crate::db_trait::*;

/// 创建课程（仅管理员）
pub fn create_course(
    db: &impl CourseRepo,
    user: &User,
    name: &str,
    teacher_name: &str,
    description: &str,
) -> Result<Course, String> {
    if !user.is_admin() {
        return Err("仅管理员可创建课程".into());
    }
    let course = Course {
        id: 0,
        name: name.into(),
        teacher_name: teacher_name.into(),
        description: description.into(),
    };
    db.add_course(course)
}

/// 获取课程列表（所有登录用户均可）
pub fn get_courses(db: &impl CourseRepo, _user: &User) -> Vec<Course> {
    db.list_courses()
}

/// 删除课程（仅管理员）
pub fn delete_course(db: &impl CourseRepo, user: &User, course_id: u64) -> Result<(), String> {
    if !user.is_admin() {
        return Err("仅管理员可删除课程".into());
    }
    db.delete_course(course_id)
}

/// 选课（学生为自己选，管理员可为任何人选）
pub fn enroll_course(
    db: &impl EnrollmentRepo,
    course_repo: &impl CourseRepo,
    user: &User,
    student_id: u64,
    course_id: u64,
) -> Result<Enrollment, String> {
    match user.role {
        Role::Student if user.id == student_id => {},
        Role::Admin => {},
        _ => return Err("无选课权限".into()),
    }
    course_repo.find_course(course_id).ok_or_else(|| "课程不存在".to_string())?;
    db.enroll(student_id, course_id)
}

/// 获取选课记录（老师或管理员可看全部，学生只看自己）
pub fn get_enrollments(
    db: &impl EnrollmentRepo,
    user: &User,
    student_id: Option<u64>,
) -> Vec<Enrollment> {
    if user.is_admin() || user.is_teacher_or_admin() {
        if let Some(sid) = student_id {
            db.list_by_student(sid)
        } else {
            db.list_all()
        }
    } else {
        db.list_by_student(user.id)
    }
}

/// 添加过程记录（学生为自己添加，管理员可任意）
pub fn add_process_record(
    db: &impl ProcessRecordRepo,
    user: &User,
    course_id: u64,
    student_id: u64,
    content: &str,
) -> Result<ProcessRecord, String> {
    match user.role {
        Role::Student if user.id == student_id => {},
        Role::Admin => {},
        _ => return Err("无权添加过程记录".into()),
    }
    let record = ProcessRecord {
        id: 0,
        course_id,
        student_id,
        content: content.into(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };
    db.add(record)
}

/// 查看过程记录（老师/管理员看全课程，学生只看自己）
pub fn get_process_records(
    db: &impl ProcessRecordRepo,
    user: &User,
    course_id: u64,
    student_id: Option<u64>,
) -> Vec<ProcessRecord> {
    if user.is_admin() || user.is_teacher_or_admin() {
        if let Some(sid) = student_id {
            db.list_by_student_and_course(sid, course_id)
        } else {
            db.list_by_course(course_id)
        }
    } else {
        db.list_by_student_and_course(user.id, course_id)
    }
}

/// 提交课程作品（学生为自己，管理员可代交）
pub fn submit_work(
    db: &impl CourseWorkRepo,
    user: &User,
    course_id: u64,
    student_id: u64,
    description: &str,
    file_path: Option<String>,
) -> Result<CourseWork, String> {
    match user.role {
        Role::Student if user.id == student_id => {},
        Role::Admin => {},
        _ => return Err("无权提交作品".into()),
    }
    let work = CourseWork {
        id: 0,
        course_id,
        student_id,
        description: description.into(),
        file_path,
        grade: None,
        comment: None,
    };
    db.submit(work)
}

/// 查看作品（老师/管理员看全课程，学生看自己的）
pub fn get_works(
    db: &impl CourseWorkRepo,
    user: &User,
    course_id: u64,
    student_id: Option<u64>,
) -> Vec<CourseWork> {
    if user.is_admin() || user.is_teacher_or_admin() {
        if let Some(sid) = student_id {
            db.list_by_student_and_course(sid, course_id)
        } else {
            db.list_by_course(course_id)
        }
    } else {
        db.list_by_student_and_course(user.id, course_id)
    }
}

/// 打分与评语（仅教师或管理员）
pub fn grade_work(
    db: &impl CourseWorkRepo,
    user: &User,
    work_id: u64,
    grade: f32,
    comment: String,
) -> Result<CourseWork, String> {
    if !user.is_teacher_or_admin() {
        return Err("仅教师或管理员可评分".into());
    }
    let mut work = db.find_by_id(work_id).ok_or_else(|| "作品不存在".to_string())?;
    work.grade = Some(grade);
    work.comment = Some(comment);
    db.update(work.clone())?;
    Ok(work)
}