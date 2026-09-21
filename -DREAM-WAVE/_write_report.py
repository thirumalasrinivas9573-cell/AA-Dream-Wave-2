content = open('_report_content.jsx', 'r', encoding='utf-8').read()
open('client/src/pages/Report.jsx', 'w', encoding='utf-8').write(content)
print('done')
