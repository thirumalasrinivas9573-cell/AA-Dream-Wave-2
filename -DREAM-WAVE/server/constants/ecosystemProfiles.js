/** Public discovery profile projections — never expose internal org data. */

const PUBLIC_COMPANY_FIELDS = [
  '_id',
  'name',
  'industry',
  'website',
  'logoUrl',
  'location',
  'city',
  'country',
  'about',
  'description',
  'companySize',
  'headquarters',
  'careersPageUrl',
  'socialLinks',
  'verified',
  'isPublic',
  'activeJobsCount',
  'activeInternshipsCount',
  'status',
  'createdAt',
  'updatedAt',
].join(' ')

const PUBLIC_INSTITUTION_FIELDS = [
  '_id',
  'name',
  'type',
  'code',
  'website',
  'logoUrl',
  'city',
  'state',
  'country',
  'description',
  'departments',
  'programs',
  'verified',
  'isPublic',
  'createdAt',
  'updatedAt',
].join(' ')

const INSTITUTION_PROFILE_WRITABLE = [
  'name',
  'type',
  'code',
  'email',
  'phone',
  'website',
  'logoUrl',
  'address',
  'city',
  'state',
  'country',
  'description',
  'departments',
  'programs',
  'isPublic',
]

module.exports = {
  PUBLIC_COMPANY_FIELDS,
  PUBLIC_INSTITUTION_FIELDS,
  INSTITUTION_PROFILE_WRITABLE,
}
