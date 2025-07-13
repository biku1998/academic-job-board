-- CreateTable
CREATE TABLE "institutions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "website" TEXT,
    "type" TEXT,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "contact_info" TEXT,
    "institution_id" INTEGER NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplines" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description_html" TEXT,
    "description_text" TEXT,
    "category" TEXT,
    "seniority_level" TEXT,
    "job_type" TEXT,
    "work_modality" TEXT,
    "salary_range" TEXT,
    "contract_type" TEXT,
    "duration_months" INTEGER,
    "renewable" BOOLEAN,
    "open_date" TIMESTAMP(3),
    "close_date" TIMESTAMP(3),
    "deadline_date" TIMESTAMP(3),
    "application_link" TEXT,
    "source_url" TEXT,
    "source_portal" TEXT,
    "funding_source" TEXT,
    "visa_sponsorship" BOOLEAN,
    "interview_process" TEXT,
    "department_id" INTEGER NOT NULL,
    "discipline_id" INTEGER NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_requirements" (
    "id" SERIAL NOT NULL,
    "job_posting_id" INTEGER NOT NULL,
    "document_type" TEXT,
    "reference_letters_required" INTEGER,
    "platform" TEXT,

    CONSTRAINT "application_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_keywords" (
    "job_posting_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,

    CONSTRAINT "job_keywords_pkey" PRIMARY KEY ("job_posting_id","keyword_id")
);

-- CreateTable
CREATE TABLE "language_requirements" (
    "job_posting_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,

    CONSTRAINT "language_requirements_pkey" PRIMARY KEY ("job_posting_id","language")
);

-- CreateTable
CREATE TABLE "suitable_backgrounds" (
    "job_posting_id" INTEGER NOT NULL,
    "background" TEXT NOT NULL,

    CONSTRAINT "suitable_backgrounds_pkey" PRIMARY KEY ("job_posting_id","background")
);

-- CreateTable
CREATE TABLE "geo_locations" (
    "job_posting_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,

    CONSTRAINT "geo_locations_pkey" PRIMARY KEY ("job_posting_id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "job_posting_id" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "title" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("job_posting_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "keywords_name_key" ON "keywords"("name");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "disciplines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_requirements" ADD CONSTRAINT "application_requirements_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_keywords" ADD CONSTRAINT "job_keywords_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_keywords" ADD CONSTRAINT "job_keywords_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_requirements" ADD CONSTRAINT "language_requirements_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suitable_backgrounds" ADD CONSTRAINT "suitable_backgrounds_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_locations" ADD CONSTRAINT "geo_locations_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enable RLS on all the tables
ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disciplines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_postings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "keywords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_keywords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "language_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suitable_backgrounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geo_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;