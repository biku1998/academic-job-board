import { z } from "zod";

// Job posting schema
export const JobPostingSchema = z.object({
  id: z.number(),
  g: z.number(),
  name: z.string(),
  univ: z.string(),
  url: z.url(),
  description: z.string(),
  deadline_raw: z.string(),
  unit_name: z.string(),
  disc: z.string(),
  close_date_raw: z.string(),
  salary: z.string(),
  stat: z.number(),
  location: z.string(),
  tag: z.string(),
  instructions: z.string(),
  open_date_raw: z.string(),
  legacy_position_id: z.number(),
  qualifications: z.string(),
  apply: z.url(),
});

export const JobListingResponseSchema = z.object({
  results: z.array(JobPostingSchema),
  hint: z.string(),
  limit: z.number(),
  page: z.number(),
  title: z.string(),
  unit_list: z.array(z.string()),
  count: z.number(),
  total_count: z.number(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export type TransformedJob = {
  title: string;
  descriptionHtml: string | null;
  descriptionText: string | null;
  category: string | null;
  seniorityLevel: string | null;
  jobType: string | null;
  workModality: string | null;
  salaryRange: string | null;
  contractType: string | null;
  durationMonths: number | null;
  renewable: boolean | null;
  openDate: Date | null;
  closeDate: Date | null;
  deadlineDate: Date | null;
  applicationLink: string;
  sourceUrl: string;
  sourcePortal: string;
  fundingSource: string | null;
  visaSponsorship: boolean | null;
  interviewProcess: string | null;
  departmentKey: string;
  disciplineKey: string;
  keywords: string[];
  instructions: string;
  qualifications: string;
  legacyPositionId: number;
};
