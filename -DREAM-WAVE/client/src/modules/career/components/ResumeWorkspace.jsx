import { useState } from 'react'
import { Button, EmptyState, FormField } from '@shared/components/ui'

export const EMPTY_RESUME = {
  title: 'Professional Resume',
  template: 'modern',
  personal: { fullName: '', headline: '', email: '', phone: '', location: '', summary: '', portfolio: '', github: '', linkedin: '' },
  education: [], skills: [], projects: [], experience: [], internships: [], certifications: [], achievements: [], languages: [], socialLinks: [], references: [],
}

const SECTION_LABELS = {
  education: 'Education',
  experience: 'Experience',
  internships: 'Internships',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
  languages: 'Languages',
  references: 'References',
}

const EMPTY_ITEMS = {
  education: { institution: '', degree: '', field: '', startDate: '', endDate: '', cgpa: '', description: '' },
  experience: { title: '', organization: '', location: '', startDate: '', endDate: '', current: false, description: '', highlights: [] },
  internships: { title: '', organization: '', location: '', startDate: '', endDate: '', current: false, description: '', highlights: [] },
  projects: { title: '', description: '', technologies: [], githubUrl: '', demoUrl: '' },
  certifications: { title: '', issuer: '', issuedAt: '', credentialId: '', url: '' },
  achievements: { title: '', issuer: '', date: '', description: '' },
  languages: { name: '', proficiency: '' },
  references: { name: '', relationship: '', organization: '', email: '', phone: '' },
}

export function TemplatePicker({ value, onChange }) {
  return <div className="resume-template-picker" role="radiogroup" aria-label="Resume template">{[
    ['modern', 'Modern', 'Strong headings and balanced spacing'],
    ['classic', 'Classic', 'Traditional and formal presentation'],
    ['compact', 'Compact', 'Dense layout for experienced candidates'],
  ].map(([id, name, detail]) => <button type="button" role="radio" aria-checked={value === id} className={value === id ? 'is-active' : ''} onClick={() => onChange(id)} key={id}><i className={`template-mini template-mini--${id}`} /><strong>{name}</strong><small>{detail}</small></button>)}</div>
}

function PersonalEditor({ value, onChange }) {
  const set = (field, fieldValue) => onChange({ ...value, [field]: fieldValue })
  return <div className="resume-fields">{[
    ['fullName','Full name','text'], ['headline','Professional headline','text'], ['email','Email','email'],
    ['phone','Phone','tel'], ['location','Location','text'], ['portfolio','Portfolio URL','url'],
    ['github','GitHub URL','url'], ['linkedin','LinkedIn URL','url'],
  ].map(([field, label, type]) => <FormField label={label} key={field}><input className="input" type={type} value={value?.[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}<FormField label="Professional summary" className="resume-field-wide"><textarea className="textarea" rows="6" maxLength="3000" value={value?.summary || ''} onChange={(event) => set('summary', event.target.value)} /></FormField></div>
}

function SkillsEditor({ value, onChange }) {
  const [name, setName] = useState('')
  const add = () => {
    if (!name.trim()) return
    onChange([...value, { name: name.trim(), category: 'Technical', level: 70 }])
    setName('')
  }
  return <div className="resume-skill-editor"><div><input className="input" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }} placeholder="Add a skill" /><Button onClick={add}>Add</Button></div>{!value.length ? <EmptyState title="No skills added" message="Add role-relevant skills for recruiters and ATS matching." /> : <ul>{value.map((skill, index) => <li key={`${skill.name}-${index}`}><input className="input" value={skill.name} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /><select className="select" value={skill.category || 'Technical'} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item))}><option>Technical</option><option>Soft Skill</option><option>Tool</option><option>Language</option></select><input type="range" min="0" max="100" value={skill.level || 0} aria-label={`${skill.name} skill level`} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, level: Number(event.target.value) } : item))} /><span>{skill.level || 0}%</span><button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${skill.name}`}>×</button></li>)}</ul>}</div>
}

function EntryFields({ section, item, onChange }) {
  const set = (field, value) => onChange({ ...item, [field]: value })
  if (section === 'education') return <div className="resume-entry-fields">{[['institution','Institution'],['degree','Degree'],['field','Field of study'],['startDate','Start'],['endDate','End'],['cgpa','CGPA']].map(([field,label]) => <FormField label={label} key={field}><input className="input" value={item[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}<FormField label="Description" className="resume-field-wide"><textarea className="textarea" value={item.description || ''} onChange={(event) => set('description', event.target.value)} /></FormField></div>
  if (section === 'experience' || section === 'internships') return <div className="resume-entry-fields">{[['title','Role'],['organization','Organization'],['location','Location'],['startDate','Start'],['endDate','End']].map(([field,label]) => <FormField label={label} key={field}><input className="input" value={item[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}<FormField label="Description" className="resume-field-wide"><textarea className="textarea" rows="4" value={item.description || ''} onChange={(event) => set('description', event.target.value)} /></FormField><FormField label="Highlights" hint="One per line" className="resume-field-wide"><textarea className="textarea" value={(item.highlights || []).join('\n')} onChange={(event) => set('highlights', event.target.value.split('\n').filter(Boolean))} /></FormField></div>
  if (section === 'projects') return <div className="resume-entry-fields"><FormField label="Project title"><input className="input" value={item.title || ''} onChange={(event) => set('title', event.target.value)} /></FormField><FormField label="Technologies" hint="Comma separated"><input className="input" value={(item.technologies || []).join(', ')} onChange={(event) => set('technologies', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} /></FormField><FormField label="GitHub"><input className="input" value={item.githubUrl || ''} onChange={(event) => set('githubUrl', event.target.value)} /></FormField><FormField label="Demo"><input className="input" value={item.demoUrl || ''} onChange={(event) => set('demoUrl', event.target.value)} /></FormField><FormField label="Description" className="resume-field-wide"><textarea className="textarea" rows="4" value={item.description || ''} onChange={(event) => set('description', event.target.value)} /></FormField></div>
  if (section === 'certifications') return <div className="resume-entry-fields">{[['title','Certificate'],['issuer','Issuer'],['issuedAt','Issue date'],['credentialId','Credential ID'],['url','Verification URL']].map(([field,label]) => <FormField label={label} key={field}><input className="input" value={item[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}</div>
  if (section === 'achievements') return <div className="resume-entry-fields">{[['title','Achievement'],['issuer','Issuer'],['date','Date']].map(([field,label]) => <FormField label={label} key={field}><input className="input" value={item[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}<FormField label="Description" className="resume-field-wide"><textarea className="textarea" value={item.description || ''} onChange={(event) => set('description', event.target.value)} /></FormField></div>
  if (section === 'languages') return <div className="resume-entry-fields"><FormField label="Language"><input className="input" value={item.name || ''} onChange={(event) => set('name', event.target.value)} /></FormField><FormField label="Proficiency"><input className="input" value={item.proficiency || ''} onChange={(event) => set('proficiency', event.target.value)} placeholder="Native, fluent, intermediate" /></FormField></div>
  return <div className="resume-entry-fields">{[['name','Reference name'],['relationship','Relationship'],['organization','Organization'],['email','Email'],['phone','Phone']].map(([field,label]) => <FormField label={label} key={field}><input className="input" value={item[field] || ''} onChange={(event) => set(field, event.target.value)} /></FormField>)}</div>
}

function RepeatableEditor({ section, value, onChange }) {
  const [openIndex, setOpenIndex] = useState(value.length ? 0 : -1)
  const add = () => { onChange([...value, { ...EMPTY_ITEMS[section] }]); setOpenIndex(value.length) }
  return <div className="resume-repeatable"><header><div><h3>{SECTION_LABELS[section]}</h3><small>Add complete, evidence-based entries.</small></div><Button onClick={add}>+ Add</Button></header>{!value.length ? <EmptyState title={`No ${SECTION_LABELS[section].toLowerCase()} added`} message="Use Add to create your first entry." /> : value.map((item,index) => <article key={item._id || index}><button type="button" className="resume-entry-toggle" onClick={() => setOpenIndex(openIndex === index ? -1 : index)}><strong>{item.title || item.degree || item.name || `New ${SECTION_LABELS[section].slice(0,-1)}`}</strong><span>{openIndex === index ? '−' : '+'}</span></button>{openIndex === index && <><EntryFields section={section} item={item} onChange={(next) => onChange(value.map((entry,itemIndex) => itemIndex === index ? next : entry))} /><Button variant="ghost" onClick={() => onChange(value.filter((_,itemIndex) => itemIndex !== index))}>Remove entry</Button></>}</article>)}</div>
}

export function ResumeEditor({ resume, onChange }) {
  const [section, setSection] = useState('personal')
  const tabs = [['personal','Personal'],['skills','Skills'],['education','Education'],['experience','Experience'],['internships','Internships'],['projects','Projects'],['certifications','Certifications'],['achievements','Achievements'],['languages','Languages'],['references','References']]
  return <section className="resume-editor"><nav aria-label="Resume sections">{tabs.map(([id,label]) => <button type="button" className={section === id ? 'is-active' : ''} onClick={() => setSection(id)} key={id}>{label}<span>{id === 'personal' ? '' : resume[id]?.length || 0}</span></button>)}</nav><div className="resume-editor__content">{section === 'personal' ? <PersonalEditor value={resume.personal} onChange={(personal) => onChange({ ...resume, personal })} /> : section === 'skills' ? <SkillsEditor value={resume.skills || []} onChange={(skills) => onChange({ ...resume, skills })} /> : <RepeatableEditor section={section} value={resume[section] || []} onChange={(value) => onChange({ ...resume, [section]: value })} />}</div></section>
}

function ResumeSection({ title, children }) {
  return <section className="resume-preview-section"><h2>{title}</h2>{children}</section>
}

export function ResumePreview({ resume }) {
  const p = resume.personal || {}
  const datedGroups = [['Experience',resume.experience],['Internships',resume.internships]]
  return <article className={`resume-preview resume-preview--${resume.template || 'modern'}`} id="career-resume-preview">
    <header><h1>{p.fullName || 'Your Name'}</h1><h2>{p.headline || 'Professional Headline'}</h2><p>{[p.email,p.phone,p.location].filter(Boolean).join(' • ')}</p><nav>{[['Portfolio',p.portfolio],['GitHub',p.github],['LinkedIn',p.linkedin]].filter(([,url]) => url).map(([label,url]) => <a href={url} key={label}>{label}</a>)}</nav></header>
    {p.summary && <ResumeSection title="Professional Summary"><p>{p.summary}</p></ResumeSection>}
    {resume.skills?.length > 0 && <ResumeSection title="Skills"><div className="resume-preview-skills">{resume.skills.map((skill,index) => <span key={`${skill.name}-${index}`}>{skill.name}</span>)}</div></ResumeSection>}
    {datedGroups.map(([title,items]) => items?.length ? <ResumeSection title={title} key={title}>{items.map((item,index) => <div className="resume-preview-entry" key={item._id || index}><div><strong>{item.title}</strong><span>{[item.organization,item.location].filter(Boolean).join(' · ')}</span></div><time>{[item.startDate,item.current ? 'Present' : item.endDate].filter(Boolean).join(' – ')}</time><p>{item.description}</p>{item.highlights?.length > 0 && <ul>{item.highlights.map((line,lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>}</div>)}</ResumeSection> : null)}
    {resume.education?.length > 0 && <ResumeSection title="Education">{resume.education.map((item,index) => <div className="resume-preview-entry" key={item._id || index}><div><strong>{item.degree}{item.field ? `, ${item.field}` : ''}</strong><span>{item.institution}</span></div><time>{[item.startDate,item.endDate].filter(Boolean).join(' – ')}</time><p>{[item.cgpa && `CGPA: ${item.cgpa}`,item.description].filter(Boolean).join(' · ')}</p></div>)}</ResumeSection>}
    {resume.projects?.length > 0 && <ResumeSection title="Projects">{resume.projects.map((item,index) => <div className="resume-preview-entry" key={item._id || index}><div><strong>{item.title}</strong><span>{item.technologies?.join(', ')}</span></div><p>{item.description}</p></div>)}</ResumeSection>}
    {resume.certifications?.length > 0 && <ResumeSection title="Certifications">{resume.certifications.map((item,index) => <div className="resume-preview-line" key={item._id || index}><strong>{item.title}</strong><span>{[item.issuer,item.issuedAt].filter(Boolean).join(' · ')}</span></div>)}</ResumeSection>}
    {resume.achievements?.length > 0 && <ResumeSection title="Achievements">{resume.achievements.map((item,index) => <div className="resume-preview-line" key={item._id || index}><strong>{item.title}</strong><span>{[item.issuer,item.date].filter(Boolean).join(' · ')}</span></div>)}</ResumeSection>}
    {resume.languages?.length > 0 && <ResumeSection title="Languages"><p>{resume.languages.map((item) => `${item.name}${item.proficiency ? ` (${item.proficiency})` : ''}`).join(' • ')}</p></ResumeSection>}
    {resume.references?.length > 0 && <ResumeSection title="References">{resume.references.map((item,index) => <div className="resume-preview-line" key={item._id || index}><strong>{item.name}</strong><span>{[item.relationship,item.organization,item.email,item.phone].filter(Boolean).join(' · ')}</span></div>)}</ResumeSection>}
  </article>
}

export function ATSPanel({ analysis, onAnalyze, loading }) {
  return <aside className="ats-panel"><header><div><span>Rules engine · AI-ready</span><h2>Resume Analysis</h2></div><Button variant="secondary" onClick={onAnalyze} disabled={loading}>{loading ? 'Analyzing…' : 'Refresh'}</Button></header><div className="ats-scores">{[['Resume strength',analysis?.strength],['Formatting',analysis?.formattingScore],['Keyword match',analysis?.keywordMatch]].map(([label,value]) => <article key={label}><div style={{ '--score': `${value || 0}%` }}><strong>{value || 0}</strong></div><span>{label}</span></article>)}</div>{analysis?.missingSections?.length > 0 && <section><h3>Missing sections</h3><div>{analysis.missingSections.map((item) => <span key={item}>{item}</span>)}</div></section>}{analysis?.missingSkills?.length > 0 && <section><h3>Missing skills</h3><div>{analysis.missingSkills.map((item) => <span key={item}>{item}</span>)}</div></section>}{analysis?.suggestions?.length > 0 && <section><h3>Suggested improvements</h3><ul>{analysis.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></section>}<p>Semantic analysis and role-specific AI recommendations connect through this versioned analysis contract in a future release.</p></aside>
}
