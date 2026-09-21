const CAREER_DATASET = {
  'dentist': {
    core_subjects: ['Biology', 'Chemistry'],
    secondary_subjects: ['Physics'],
    low_relevance: ['Mathematics'],
    important_skills: ['Hand precision', 'Patient communication', 'Diagnosis', 'Medical knowledge'],
    career_focus: 'Oral health, diagnosis, treatment, dental surgery',
  },
  'doctor': {
    core_subjects: ['Biology', 'Chemistry', 'Physics'],
    secondary_subjects: ['Psychology', 'Statistics'],
    low_relevance: ['Computer Science'],
    important_skills: ['Clinical reasoning', 'Patient care', 'Diagnosis', 'Communication'],
    career_focus: 'Diagnosing and treating illness, patient care',
  },
  'software engineer': {
    core_subjects: ['Programming', 'Data Structures', 'Algorithms'],
    secondary_subjects: ['Mathematics', 'Logic', 'Databases'],
    low_relevance: ['Biology', 'History'],
    important_skills: ['Problem solving', 'Coding', 'Debugging', 'System design'],
    career_focus: 'Building software, applications, and systems',
  },
  'data scientist': {
    core_subjects: ['Statistics', 'Mathematics', 'Programming', 'Machine Learning'],
    secondary_subjects: ['Databases', 'Data Visualization'],
    low_relevance: ['History', 'Literature'],
    important_skills: ['Statistical analysis', 'Python', 'Data wrangling', 'Model building'],
    career_focus: 'Extracting insights from data to drive decisions',
  },
  'lawyer': {
    core_subjects: ['Law', 'Legal Studies', 'English', 'Critical Thinking'],
    secondary_subjects: ['History', 'Political Science', 'Psychology'],
    low_relevance: ['Physics', 'Chemistry'],
    important_skills: ['Argumentation', 'Research', 'Writing', 'Negotiation'],
    career_focus: 'Legal representation, contracts, litigation',
  },
  'entrepreneur': {
    core_subjects: ['Business', 'Marketing', 'Finance', 'Strategy'],
    secondary_subjects: ['Psychology', 'Technology', 'Communication'],
    low_relevance: ['Advanced Mathematics', 'Chemistry'],
    important_skills: ['Leadership', 'Risk management', 'Sales', 'Problem solving'],
    career_focus: 'Building and scaling businesses',
  },
  'architect': {
    core_subjects: ['Design', 'Mathematics', 'Physics', 'Drawing'],
    secondary_subjects: ['History of Architecture', 'Environmental Science'],
    low_relevance: ['Biology', 'Chemistry'],
    important_skills: ['Spatial reasoning', 'CAD software', 'Creativity', 'Structural knowledge'],
    career_focus: 'Designing buildings and spaces',
  },
  'psychologist': {
    core_subjects: ['Psychology', 'Biology', 'Statistics'],
    secondary_subjects: ['Sociology', 'Philosophy', 'Neuroscience'],
    low_relevance: ['Advanced Mathematics', 'Chemistry'],
    important_skills: ['Empathy', 'Active listening', 'Research', 'Assessment'],
    career_focus: 'Understanding and treating mental health and behavior',
  },
  'nurse': {
    core_subjects: ['Biology', 'Chemistry', 'Anatomy', 'Pharmacology'],
    secondary_subjects: ['Psychology', 'Physics'],
    low_relevance: ['Mathematics', 'History'],
    important_skills: ['Patient care', 'Clinical skills', 'Communication', 'Empathy'],
    career_focus: 'Patient care, health monitoring, medical support',
  },
  'mechanical engineer': {
    core_subjects: ['Physics', 'Mathematics', 'Engineering Mechanics', 'Thermodynamics'],
    secondary_subjects: ['Chemistry', 'Computer Science'],
    low_relevance: ['Biology', 'History'],
    important_skills: ['CAD design', 'Problem solving', 'Material science', 'Systems thinking'],
    career_focus: 'Designing and building mechanical systems and devices',
  },
}

const getCareerData = (goal) => {
  if (!goal) return null
  const lower = goal.toLowerCase().trim()
  if (CAREER_DATASET[lower]) return CAREER_DATASET[lower]
  const key = Object.keys(CAREER_DATASET).find(k => lower.includes(k) || k.includes(lower))
  return key ? CAREER_DATASET[key] : null
}

const buildCareerContext = (goal) => {
  const data = getCareerData(goal)
  if (!data) return ''
  return `\nCAREER KNOWLEDGE BASE for "${goal}":\n- Core subjects: ${data.core_subjects.join(', ')}\n- Secondary subjects: ${data.secondary_subjects.join(', ')}\n- Low relevance: ${data.low_relevance.join(', ')}\n- Key skills: ${data.important_skills.join(', ')}\n- Career focus: ${data.career_focus}\nUse this to assess relevance honestly.`
}

module.exports = { CAREER_DATASET, getCareerData, buildCareerContext }
