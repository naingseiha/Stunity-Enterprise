#!/usr/bin/env python3
"""
Add schoolId and academicYearId to Prisma schema models
Systematically updates all models for multi-tenancy
"""

import re

# Read the schema
with open('schema.prisma', 'r') as f:
    content = f.read()

# Models that need schoolId (almost all)
models_needing_school_id = [
    'Attendance', 'Class', 'Grade', 'GradeConfirmation', 'StudentMonthlySummary',
    'Student', 'Parent', 'StudentParent', 'SubjectTeacher', 'Subject',
    'TeacherClass', 'Teacher', 'User', 'AuditLog', 'Post', 'Comment', 'Like',
    'PollOption', 'PollVote', 'Follow', 'Notification', 'PostReport',
    'CommentReaction', 'UserSkill', 'SkillEndorsement', 'Experience',
    'Certification', 'Project', 'Achievement', 'Recommendation', 'UserBlock',
    'PostView'
]

# Models that need academicYearId (academic-related)
models_needing_academic_year = [
    'Class', 'Grade', 'Attendance'
]

def add_school_id_to_model(model_name, content):
    """Add schoolId field after id field in a model"""
    pattern = rf'(model {model_name} \{{\s+id\s+String\s+@id\s+@default\(cuid\(\)\))'
    
    school_field = '''
  schoolId  String
  school    School @relation(fields: [schoolId], references: [id], onDelete: Cascade)'''
    
    replacement = r'\1' + school_field
    content = re.sub(pattern, replacement, content)
    
    # Add index for schoolId before @@map
    pattern2 = rf'(model {model_name}.*?)(  @@map\()'
    replacement2 = r'\1  @@index([schoolId])\n\2'
    content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
    
    return content

def add_academic_year_to_model(model_name, content):
    """Replace hardcoded academicYear string with academicYearId"""
    # Find the model
    pattern = rf'(model {model_name}.*?)(academicYear\s+String\s+@default\("2024-2025"\))'
    
    if re.search(pattern, content, re.DOTALL):
        replacement = r'\1academicYearId String\n  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    return content

# Process models
print("🔄 Adding schoolId to models...")
for model in models_needing_school_id:
    content = add_school_id_to_model(model, content)
    print(f"  ✅ Added schoolId to {model}")

print("\n🔄 Adding academicYearId to models...")
for model in models_needing_academic_year:
    content = add_academic_year_to_model(model, content)
    print(f"  ✅ Added academicYearId to {model}")

# Write updated schema
with open('schema.prisma', 'w') as f:
    f.write(content)

print("\n✅ Schema updated successfully!")
print("📝 Now run: npx prisma format to format the schema")
