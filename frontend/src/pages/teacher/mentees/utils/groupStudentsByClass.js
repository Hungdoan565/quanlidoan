/**
 * Groups students by class within each health category
 * @param {Object} categorizedStudents - { no_topic: [...], danger: [...], attention: [...], good: [...] }
 * @returns {Object} - { no_topic: { 'CS101': [...], 'CS102': [...] }, ... }
 */
export function groupStudentsByClass(categorizedStudents) {
  const result = {};
  
  for (const [healthCategory, students] of Object.entries(categorizedStudents)) {
    const grouped = {};
    
    students.forEach(student => {
      const classCode = student.class?.code || 'Không xác định';
      if (!grouped[classCode]) {
        grouped[classCode] = [];
      }
      grouped[classCode].push(student);
    });
    
    // Sort groups alphabetically by class code
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .forEach(key => {
        sortedGrouped[key] = grouped[key];
      });
    
    result[healthCategory] = sortedGrouped;
  }
  
  return result;
}

/**
 * Check if grouping is needed (more than one unique class)
 */
export function shouldGroupByClass(students) {
  const uniqueClasses = new Set(students.map(s => s.class?.code || 'unknown'));
  return uniqueClasses.size > 1;
}
