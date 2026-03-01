import fs from 'fs';
import path from 'path';

function main() {
    const IMPORT_DIR = './scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08';
    const students = require(path.resolve(IMPORT_DIR, 'students.json'));

    const classlessStudents = students.filter((s: any) => !s.classId);
    console.log(`Total Students: ${students.length}`);
    console.log(`Students with NO Class: ${classlessStudents.length}`);
    console.log(`Students WITH Class: ${students.length - classlessStudents.length}`);
}

main();
