import type { Tutor, StudySheet, QuizQuestion } from './types';

export const MOCK_TUTORS: Tutor[] = [
  {
    id: 't1',
    name: 'พี่นัท (Pee Nut)',
    bio: 'เหรียญทองโอลิมปิกฟิสิกส์ สรุปเนื้อหาเข้าใจง่าย เน้นเทคนิคทำโจทย์ไว',
    university: 'คณะวิศวกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
    faculty: 'Engineering',
    subjects: ['Physics', 'Math'],
    hourlyRate: 350,
    rating: 4.9,
    isVerified: true,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nut',
    introVideoUrl: 'https://example.com/video1'
  },
  {
    id: 't2',
    name: 'พี่เจน (Khun Jane)',
    bio: 'สอนภาษาอังกฤษสนุก ไม่น่าเบื่อ เน้นการใช้จริงและเทคนิคตัดช้อยส์ TGAT',
    university: 'คณะอักษรศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
    faculty: 'Arts',
    subjects: ['English'],
    hourlyRate: 400,
    rating: 4.8,
    isVerified: true,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane'
  },
  {
    id: 't3',
    name: 'อ.มาร์ค (Ajarn Mark)',
    bio: 'เชี่ยวชาญเคมี A-Level ประสบการณ์สอนกว่า 5 ปี เข้าใจจุดที่เด็กมักพลาด',
    university: 'คณะวิทยาศาสตร์ มหาวิทยาลัยมหิดล',
    faculty: 'Science',
    subjects: ['Chemistry'],
    hourlyRate: 500,
    rating: 5.0,
    isVerified: true,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark'
  }
];

export const MOCK_SHEETS: StudySheet[] = [
  {
    id: 's1',
    title: 'สรุปสูตรฟิสิกส์ A-Level (ฉบับรวบรัด)',
    subject: 'Physics',
    price: 150,
    sellerId: 't1',
    university: 'Chulalongkorn University',
    faculty: 'Engineering',
    rating: 4.9,
    previewUrls: ['https://example.com/preview1.jpg'],
    pdfUrl: 'https://example.com/sheet1.pdf'
  },
  {
    id: 's2',
    title: 'TGAT English Vocabulary Checklist',
    subject: 'English',
    price: 99,
    sellerId: 't2',
    university: 'Chulalongkorn University',
    faculty: 'Arts',
    rating: 4.7,
    previewUrls: ['https://example.com/preview2.jpg'],
    pdfUrl: 'https://example.com/sheet2.pdf'
  }
];

export const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Social', 'Thai'];
export const UNIVERSITIES = ['Chulalongkorn', 'Mahidol', 'Thammasat', 'Kasetsart', 'Chiang Mai', 'Khon Kaen'];
