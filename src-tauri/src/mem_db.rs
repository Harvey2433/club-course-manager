use std::collections::HashMap;
use std::sync::RwLock;
use crate::models::*;
use crate::db_trait::*;

pub struct MemDb {
    pub users: RwLock<HashMap<u64, User>>,
    pub courses: RwLock<HashMap<u64, Course>>,
    pub enrollments: RwLock<HashMap<u64, Enrollment>>,
    pub process_records: RwLock<HashMap<u64, ProcessRecord>>,
    pub course_works: RwLock<HashMap<u64, CourseWork>>,
    next_user_id: RwLock<u64>,
    next_course_id: RwLock<u64>,
    next_enrollment_id: RwLock<u64>,
    next_record_id: RwLock<u64>,
    next_work_id: RwLock<u64>,
}

impl MemDb {
    pub fn new() -> Self {
        Self {
            users: RwLock::new(HashMap::new()),
            courses: RwLock::new(HashMap::new()),
            enrollments: RwLock::new(HashMap::new()),
            process_records: RwLock::new(HashMap::new()),
            course_works: RwLock::new(HashMap::new()),
            next_user_id: RwLock::new(1),
            next_course_id: RwLock::new(1),
            next_enrollment_id: RwLock::new(1),
            next_record_id: RwLock::new(1),
            next_work_id: RwLock::new(1),
        }
    }
}

impl UserRepo for MemDb {
    fn find_by_username(&self, username: &str) -> Option<User> {
        let users = self.users.read().unwrap();
        users.values().find(|u| u.username == username).cloned()
    }

    fn find_by_id(&self, id: u64) -> Option<User> {
        self.users.read().unwrap().get(&id).cloned()
    }

    fn add_user(&self, user: User) -> Result<(), String> {
        let mut users = self.users.write().unwrap();
        if users.values().any(|u| u.username == user.username) {
            return Err("用户名已存在".into());
        }
        let id = {
            let mut next = self.next_user_id.write().unwrap();
            let id = *next;
            *next += 1;
            id
        };
        let mut u = user;
        u.id = id;
        users.insert(id, u);
        Ok(())
    }
}

impl CourseRepo for MemDb {
    fn list_courses(&self) -> Vec<Course> {
        self.courses.read().unwrap().values().cloned().collect()
    }

    fn add_course(&self, course: Course) -> Result<Course, String> {
        let mut courses = self.courses.write().unwrap();
        let id = {
            let mut next = self.next_course_id.write().unwrap();
            let id = *next;
            *next += 1;
            id
        };
        let mut c = course;
        c.id = id;
        courses.insert(id, c.clone());
        Ok(c)
    }

    fn delete_course(&self, id: u64) -> Result<(), String> {
        let mut courses = self.courses.write().unwrap();
        courses.remove(&id).map(|_| ()).ok_or_else(|| "课程不存在".into())
    }

    fn find_course(&self, id: u64) -> Option<Course> {
        self.courses.read().unwrap().get(&id).cloned()
    }
}

impl EnrollmentRepo for MemDb {
    fn enroll(&self, student_id: u64, course_id: u64) -> Result<Enrollment, String> {
        // 验证课程存在
        {
            let courses = self.courses.read().unwrap();
            if !courses.contains_key(&course_id) {
                return Err("课程不存在".into());
            }
        }
        // 检查重复
        {
            let enrollments = self.enrollments.read().unwrap();
            if enrollments.values().any(|e| e.student_id == student_id && e.course_id == course_id) {
                return Err("已选过该课程".into());
            }
        }
        let id = {
            let mut next = self.next_enrollment_id.write().unwrap();
            let id = *next;
            *next += 1;
            id
        };
        let enrollment = Enrollment { id, student_id, course_id };
        self.enrollments.write().unwrap().insert(id, enrollment.clone());
        Ok(enrollment)
    }

    fn list_by_student(&self, student_id: u64) -> Vec<Enrollment> {
        self.enrollments.read().unwrap()
            .values()
            .filter(|e| e.student_id == student_id)
            .cloned()
            .collect()
    }

    fn list_all(&self) -> Vec<Enrollment> {
        self.enrollments.read().unwrap().values().cloned().collect()
    }
}

impl ProcessRecordRepo for MemDb {
    fn add(&self, record: ProcessRecord) -> Result<ProcessRecord, String> {
        let id = {
            let mut next = self.next_record_id.write().unwrap();
            let id = *next;
            *next += 1;
            id
        };
        let mut r = record;
        r.id = id;
        self.process_records.write().unwrap().insert(id, r.clone());
        Ok(r)
    }

    fn list_by_course(&self, course_id: u64) -> Vec<ProcessRecord> {
        self.process_records.read().unwrap()
            .values()
            .filter(|r| r.course_id == course_id)
            .cloned()
            .collect()
    }

    fn list_by_student_and_course(&self, student_id: u64, course_id: u64) -> Vec<ProcessRecord> {
        self.process_records.read().unwrap()
            .values()
            .filter(|r| r.student_id == student_id && r.course_id == course_id)
            .cloned()
            .collect()
    }
}

impl CourseWorkRepo for MemDb {
    fn submit(&self, work: CourseWork) -> Result<CourseWork, String> {
        let id = {
            let mut next = self.next_work_id.write().unwrap();
            let id = *next;
            *next += 1;
            id
        };
        let mut w = work;
        w.id = id;
        self.course_works.write().unwrap().insert(id, w.clone());
        Ok(w)
    }

    fn list_by_course(&self, course_id: u64) -> Vec<CourseWork> {
        self.course_works.read().unwrap()
            .values()
            .filter(|w| w.course_id == course_id)
            .cloned()
            .collect()
    }

    fn list_by_student_and_course(&self, student_id: u64, course_id: u64) -> Vec<CourseWork> {
        self.course_works.read().unwrap()
            .values()
            .filter(|w| w.student_id == student_id && w.course_id == course_id)
            .cloned()
            .collect()
    }

    fn find_by_id(&self, id: u64) -> Option<CourseWork> {
        self.course_works.read().unwrap().get(&id).cloned()
    }

    fn update(&self, work: CourseWork) -> Result<(), String> {
        let mut works = self.course_works.write().unwrap();
        if works.contains_key(&work.id) {
            works.insert(work.id, work);
            Ok(())
        } else {
            Err("作品不存在".into())
        }
    }
}