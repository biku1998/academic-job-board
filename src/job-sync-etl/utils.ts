import { htmlToText } from "html-to-text";

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "0000-00-00 00:00:00") return null;
  let parsedDate: Date;
  if (dateStr.includes("T") || dateStr.includes(" ")) {
    parsedDate = new Date(dateStr);
  } else {
    parsedDate = new Date(dateStr + "T00:00:00");
  }
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const cleanHtml = (html: string): string => {
  if (!html) return "";
  try {
    return htmlToText(html, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: "ul", format: "unorderedList" },
        { selector: "ol", format: "orderedList" },
        { selector: "h1", format: "heading" },
        { selector: "h2", format: "heading" },
        { selector: "h3", format: "heading" },
        { selector: "h4", format: "heading" },
        { selector: "h5", format: "heading" },
        { selector: "h6", format: "heading" },
        { selector: "p", format: "paragraph" },
        { selector: "a", format: "anchor" },
      ],
    }).trim();
  } catch (error) {
    console.warn("Failed to parse HTML, falling back to regex:", error);
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }
};

export const determineJobType = (
  title: string,
  tag: string
): { jobType: string | null; seniorityLevel: string | null } => {
  const lowerTitle = title.toLowerCase();
  const lowerTag = tag.toLowerCase();
  let jobType: string | null = null;
  let seniorityLevel: string | null = null;
  if (lowerTag.includes("postdoc") || lowerTag.includes("fellow")) {
    jobType = "Postdoctoral";
    seniorityLevel = "Postdoctoral";
  } else if (lowerTag.includes("assistantprofessor")) {
    jobType = "Faculty";
    seniorityLevel = "Assistant Professor";
  } else if (lowerTag.includes("associateprofessor")) {
    jobType = "Faculty";
    seniorityLevel = "Associate Professor";
  } else if (lowerTag.includes("professor")) {
    jobType = "Faculty";
    seniorityLevel = "Professor";
  } else if (lowerTag.includes("lecturer") || lowerTag.includes("instructor")) {
    jobType = "Faculty";
    seniorityLevel = "Lecturer";
  } else if (lowerTag.includes("research")) {
    jobType = "Research";
    seniorityLevel = "Research Staff";
  } else {
    if (
      lowerTitle.includes("postdoctoral") ||
      lowerTitle.includes("postdoc") ||
      lowerTitle.includes("fellow")
    ) {
      jobType = "Postdoctoral";
      seniorityLevel = "Postdoctoral";
    } else if (lowerTitle.includes("assistant professor")) {
      jobType = "Faculty";
      seniorityLevel = "Assistant Professor";
    } else if (lowerTitle.includes("associate professor")) {
      jobType = "Faculty";
      seniorityLevel = "Associate Professor";
    } else if (
      lowerTitle.includes("professor") &&
      !lowerTitle.includes("assistant") &&
      !lowerTitle.includes("associate")
    ) {
      jobType = "Faculty";
      seniorityLevel = "Professor";
    } else if (
      lowerTitle.includes("lecturer") ||
      lowerTitle.includes("instructor")
    ) {
      jobType = "Faculty";
      seniorityLevel = "Lecturer";
    } else if (lowerTitle.includes("research")) {
      jobType = "Research";
      seniorityLevel = "Research Staff";
    }
  }
  return { jobType, seniorityLevel };
};
