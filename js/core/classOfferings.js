// ============================================
// CLASS OFFERINGS — the fixed master list of course sections a
// student can enroll into (enroll.html) or an admin can re-assign a
// student to (teacher.js), grouped by the teacher who teaches them.
// Single source of truth so the two pages can't drift out of sync
// with each other.
// ============================================

export const CLASS_OFFERINGS_BY_TEACHER = {
  'jornie.hinay@hcdc.edu.ph': [
    "00725 | ReEd 101: Faith and Reason (MWF 8:00-9:00 AM)",
    "00188 | ReEd 305 (2018): Christian Morality (MWF 9:00-10:00 AM)",
    "02201 | ReEd 203: The Catholic Church (MWF 10:00-11:00 AM)",
    "02070 | VED 310: Information Technology (MWF 3:00-4:00 PM)",
    "01555 | ReEd 203: The Catholic Church (MWF 4:00-5:00 PM)",
    "01672 | ReEd 101: Faith and Reason (TTh 9:00-10:30 AM)",
    "01167 | ReEd 203: The Catholic Church (TTh 10:30-12:00 PM)",
    "01414 | ReEd 203: The Catholic Church (TTh 10:30-12:00)",
    "00313 | ReEd 101: Faith and Reason (TTh 1:00-02:30 PM)",
    "00359 | ReEd 203: The Catholic Church (TTh 2:30-4:00 PM)"
  ],
  'iris.miranda@hcdc.edu.ph': [
    "00139 | ReEd 101: Faith and Reason (MWF 9:00-10:00 AM)",
    "01640 | ReEd 101: Faith and Reason (MWF 10:00-11:00 AM)",
    "01863 | ReEd 101: Faith and Reason (MWF 11:00-12:00 NN)",
    "00792 | ReEd 101: Faith and Reason (MWF 1:00-2:00 PM)",
    "00668 | ReEd 101: Faith and Reason (MWF 2:00-3:00 PM)",
    "02071 | VED 318: Dev. of ValEduc Instructional (MWF 4:00-5:00 PM)",
    "02067 | ReEd 101: Faith and Reason (TTh 7:30-9:00 AM)",
    "00657 | ReEd 101: Faith and Reason (TTh 9:00-10:30 AM)",
    "00646 | ReEd 101: Faith and Reason (TTh 10:30-12:00 NN)"
  ]
};

export function getOfferingsForTeacher(teacherEmail) {
  return CLASS_OFFERINGS_BY_TEACHER[teacherEmail] || [];
}
