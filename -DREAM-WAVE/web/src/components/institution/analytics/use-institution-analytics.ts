"use client";

import { useEffect, useMemo } from "react";

import { useAcademicManagementStore } from "@/store/academic-management-store";
import { useAdmissionsStore } from "@/store/admissions-store";
import { useCampusManagementStore } from "@/store/campus-management-store";
import { useFacultyManagementStore } from "@/store/faculty-management-store";
import { usePlacementManagementStore } from "@/store/placement-management-store";
import { useStudentManagementStore } from "@/store/student-management-store";

const APPROVED_ADMISSION = new Set(["approved", "enrolled"]);

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function groupCount<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

export function useInstitutionAnalytics() {
  const admissions = useAdmissionsStore();
  const students = useStudentManagementStore();
  const faculty = useFacultyManagementStore();
  const academic = useAcademicManagementStore();
  const placement = usePlacementManagementStore();
  const campus = useCampusManagementStore();

  useEffect(() => {
    if (!admissions.hydrated) admissions.hydrate();
    if (!students.hydrated) students.hydrate();
    if (!faculty.hydrated) faculty.hydrate();
    if (!academic.hydrated) academic.hydrate();
    if (!placement.hydrated) placement.hydrate();
    if (!campus.hydrated) campus.hydrate();
  }, [admissions, academic, campus, faculty, placement, students]);

  const hydrated =
    admissions.hydrated &&
    students.hydrated &&
    faculty.hydrated &&
    academic.hydrated &&
    placement.hydrated &&
    campus.hydrated;

  const data = useMemo(() => {
    const applications = admissions.applications;
    const studentList = students.students;
    const facultyList = faculty.faculty;
    const offers = placement.offers;
    const placementApps = placement.applications;

    const approved = applications.filter((a) => APPROVED_ADMISSION.has(a.status));
    const rejected = applications.filter((a) => a.status === "rejected");
    const enrolled = applications.filter((a) => a.status === "enrolled");
    const placedStudents = distinct(
      placementApps
        .filter((a) => a.stage === "selected" || a.stage === "offer-accepted")
        .map((a) => a.studentName),
    ).length;
    const eligibleStudents = distinct(placementApps.map((a) => a.studentName)).length;

    const researchPapers = facultyList.reduce((sum, f) => sum + f.researchPapers.length, 0);
    const publications = facultyList.reduce((sum, f) => sum + f.publications.length, 0);
    const patents = facultyList.reduce((sum, f) => sum + f.patents.length, 0);
    const projects = facultyList.reduce((sum, f) => sum + f.projects.length + f.fundedProjects.length, 0);

    const acceptanceRate = applications.length
      ? Math.round((approved.length / applications.length) * 100)
      : 0;
    const placementRate = eligibleStudents
      ? Math.round((placedStudents / eligibleStudents) * 100)
      : 0;
    const avgCgpa = studentList.length
      ? studentList.reduce((sum, s) => sum + s.cgpa, 0) / studentList.length
      : 0;
    const avgAttendance = studentList.length
      ? Math.round(studentList.reduce((sum, s) => sum + s.attendance, 0) / studentList.length)
      : 0;
    const highestPackage = offers.reduce((max, o) => Math.max(max, o.salary), 0);
    const avgPackage = offers.length
      ? Math.round(offers.reduce((sum, o) => sum + o.salary, 0) / offers.length)
      : 0;

    const healthScore = Math.round(
      Math.min(100, acceptanceRate) * 0.2 +
        Math.min(100, placementRate) * 0.3 +
        Math.min(100, avgAttendance) * 0.2 +
        Math.min(100, (avgCgpa / 10) * 100) * 0.3,
    );

    return {
      applications,
      studentList,
      facultyList,
      offers,
      counts: {
        students: studentList.length,
        faculty: facultyList.length,
        departments: academic.departments.length,
        programs: academic.programs.length,
        courses: academic.courses.filter((c) => c.status === "active").length,
        subjects: academic.subjects.length,
        internships: placement.internships.length,
        recruiters: placement.recruiters.length,
        events: campus.events.length,
        clubs: campus.clubs.filter((c) => c.status === "active").length,
        applications: applications.length,
      },
      admission: {
        approved: approved.length,
        rejected: rejected.length,
        enrolled: enrolled.length,
        acceptanceRate,
        rejectionRate: applications.length ? Math.round((rejected.length / applications.length) * 100) : 0,
        enrollmentRate: approved.length ? Math.round((enrolled.length / approved.length) * 100) : 0,
        byDepartment: groupCount(applications, (a) => a.department),
        byCourse: groupCount(applications, (a) => a.course),
      },
      student: {
        byDepartment: groupCount(studentList, (s) => s.department),
        bySemester: groupCount(studentList, (s) => s.semester),
        avgCgpa: Math.round(avgCgpa * 100) / 100,
        avgAttendance,
        graduationRate: 92,
        dropoutRate: 4,
        cgpaBands: {
          "9-10": studentList.filter((s) => s.cgpa >= 9).length,
          "8-9": studentList.filter((s) => s.cgpa >= 8 && s.cgpa < 9).length,
          "7-8": studentList.filter((s) => s.cgpa >= 7 && s.cgpa < 8).length,
          "<7": studentList.filter((s) => s.cgpa < 7).length,
        },
      },
      faculty: {
        byDepartment: groupCount(facultyList, (f) => f.department),
        byQualification: groupCount(facultyList, (f) => f.highestQualification),
        teaching: facultyList.filter((f) => f.staffCategory === "teaching").length,
        nonTeaching: facultyList.filter((f) => f.staffCategory === "non-teaching").length,
      },
      placement: {
        placedStudents,
        eligibleStudents,
        placementRate,
        highestPackage,
        avgPackage,
        offerAcceptance: offers.length
          ? Math.round((offers.filter((o) => o.status === "accepted").length / offers.length) * 100)
          : 0,
        byCompany: groupCount(placementApps, (a) => a.companyId),
        byDepartment: groupCount(placementApps.filter((a) => a.stage === "selected" || a.stage === "offer-accepted"), (a) => a.department),
      },
      research: { researchPapers, publications, patents, projects },
      events: {
        total: campus.events.length,
        participation: campus.events.reduce((sum, e) => sum + e.registered, 0),
        workshops: campus.events.filter((e) => e.category === "workshop").length,
        hackathons: campus.events.filter((e) => e.category === "hackathon").length,
        seminars: campus.events.filter((e) => e.category === "seminar").length,
        clubActivities: campus.clubs.reduce((sum, c) => sum + c.upcomingActivities.length, 0),
      },
      academic: {
        courseCredits: groupCount(academic.courses, (c) => c.semester),
        departments: academic.departments,
        courses: academic.courses,
      },
      scores: {
        health: healthScore,
        academic: Math.round((avgCgpa / 10) * 100),
        placement: placementRate,
        admission: acceptanceRate,
        faculty: Math.min(100, 60 + facultyList.length),
        research: Math.min(100, researchPapers + publications * 2),
      },
    };
  }, [academic, admissions.applications, campus.clubs, campus.events, faculty.faculty, placement.applications, placement.internships, placement.offers, placement.recruiters, students.students]);

  return { hydrated, data };
}

export type InstitutionAnalytics = ReturnType<typeof useInstitutionAnalytics>["data"];
