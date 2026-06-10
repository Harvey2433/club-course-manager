use crate::models::*;

pub trait UserRepo {
    fn find_by_username(&self, username: &str) -> Option<User>;
    fn find_by_id(&self, id: u64) -> Option<User>;
    fn add_user(&self, user: User) -> Result<(), String>;
}

pub trait CourseRepo {
    fn list_courses(&self) -> Vec<Course>;
    fn add_course(&self, course: Course) -> Result<Course, String>;
    fn delete_course(&self, id: u64) -> Result<(), String>;
    fn find_course(&self, id: u64) -> Option<Course>;
}

pub trait EnrollmentRepo {
    fn enroll(&self, student_id: u64, course_id: u64) -> Result<Enrollment, String>;
    fn list_by_student(&self, student_id: u64) -> Vec<Enrollment>;
    fn list_all(&self) -> Vec<Enrollment>;
}

pub trait ProcessRecordRepo {
    fn add(&self, record: ProcessRecord) -> Result<ProcessRecord, String>;
    fn list_by_course(&self, course_id: u64) -> Vec<ProcessRecord>;
    fn list_by_student_and_course(&self, student_id: u64, course_id: u64) -> Vec<ProcessRecord>;
}

pub trait CourseWorkRepo {
    fn submit(&self, work: CourseWork) -> Result<CourseWork, String>;
    fn list_by_course(&self, course_id: u64) -> Vec<CourseWork>;
    fn list_by_student_and_course(&self, student_id: u64, course_id: u64) -> Vec<CourseWork>;
    fn find_by_id(&self, id: u64) -> Option<CourseWork>;
    fn update(&self, work: CourseWork) -> Result<(), String>;
}