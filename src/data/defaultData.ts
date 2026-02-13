export const businessTypes = [
  { label: "Software Development", value: 1 },
  { label: "IT Consulting Firms", value: 2 },
  { label: "Web Designing", value: 3 },
  { label: "Marketing Agencies", value: 4 },
  { label: "Engineering Firms", value: 5 },
  { label: "Architecture Firms", value: 6 },
  { label: "Graphic Design Firms", value: 7 },
  { label: "Advertising Agencies", value: 8 },
  { label: "Video Production", value: 9 },
  { label: "Photography Studios", value: 10 },
  { label: "Healthcare Services", value: 11 },
  { label: "Educational Services", value: 12 },
  { label: "Training Institutes", value: 13 },
  { label: "Financial Services", value: 14 },
  { label: "Manufacturing", value: 15 },
  { label: "Supply Chain and Logistics", value: 16 },
  { label: "Warehousing", value: 17 },
  { label: "Retail Services", value: 18 },
  { label: "Travel Agencies", value: 19 },
  { label: "Others", value: 21 },
];
// Map industry string to businessType value
export const industryToBusinessType: Record<string, number> = {
  technology: 1,
  marketing: 4,
  finance: 14,
  retail: 18,
  healthcare: 11,
  education: 12,
  other: 21,
};

// Common countries with phone codes
export const commonCountries = [
  { code: "AF", name: "Afghanistan", phoneCode: "+93" },
  { code: "AR", name: "Argentina", phoneCode: "+54" },
  { code: "AU", name: "Australia", phoneCode: "+61" },
  { code: "AT", name: "Austria", phoneCode: "+43" },
  { code: "BD", name: "Bangladesh", phoneCode: "+880" },
  { code: "BE", name: "Belgium", phoneCode: "+32" },
  { code: "BR", name: "Brazil", phoneCode: "+55" },
  { code: "CA", name: "Canada", phoneCode: "+1" },
  { code: "CL", name: "Chile", phoneCode: "+56" },
  { code: "CN", name: "China", phoneCode: "+86" },
  { code: "CO", name: "Colombia", phoneCode: "+57" },
  { code: "CZ", name: "Czech Republic", phoneCode: "+420" },
  { code: "DK", name: "Denmark", phoneCode: "+45" },
  { code: "EG", name: "Egypt", phoneCode: "+20" },
  { code: "FI", name: "Finland", phoneCode: "+358" },
  { code: "FR", name: "France", phoneCode: "+33" },
  { code: "DE", name: "Germany", phoneCode: "+49" },
  { code: "GR", name: "Greece", phoneCode: "+30" },
  { code: "HK", name: "Hong Kong", phoneCode: "+852" },
  { code: "HU", name: "Hungary", phoneCode: "+36" },
  { code: "IN", name: "India", phoneCode: "+91" },
  { code: "ID", name: "Indonesia", phoneCode: "+62" },
  { code: "IE", name: "Ireland", phoneCode: "+353" },
  { code: "IL", name: "Israel", phoneCode: "+972" },
  { code: "IT", name: "Italy", phoneCode: "+39" },
  { code: "JP", name: "Japan", phoneCode: "+81" },
  { code: "KE", name: "Kenya", phoneCode: "+254" },
  { code: "MY", name: "Malaysia", phoneCode: "+60" },
  { code: "MX", name: "Mexico", phoneCode: "+52" },
  { code: "NL", name: "Netherlands", phoneCode: "+31" },
  { code: "NZ", name: "New Zealand", phoneCode: "+64" },
  { code: "NG", name: "Nigeria", phoneCode: "+234" },
  { code: "NO", name: "Norway", phoneCode: "+47" },
  { code: "PK", name: "Pakistan", phoneCode: "+92" },
  { code: "PH", name: "Philippines", phoneCode: "+63" },
  { code: "PL", name: "Poland", phoneCode: "+48" },
  { code: "PT", name: "Portugal", phoneCode: "+351" },
  { code: "QA", name: "Qatar", phoneCode: "+974" },
  { code: "RO", name: "Romania", phoneCode: "+40" },
  { code: "RU", name: "Russia", phoneCode: "+7" },
  { code: "SA", name: "Saudi Arabia", phoneCode: "+966" },
  { code: "SG", name: "Singapore", phoneCode: "+65" },
  { code: "ZA", name: "South Africa", phoneCode: "+27" },
  { code: "KR", name: "South Korea", phoneCode: "+82" },
  { code: "ES", name: "Spain", phoneCode: "+34" },
  { code: "LK", name: "Sri Lanka", phoneCode: "+94" },
  { code: "SE", name: "Sweden", phoneCode: "+46" },
  { code: "CH", name: "Switzerland", phoneCode: "+41" },
  { code: "TW", name: "Taiwan", phoneCode: "+886" },
  { code: "TH", name: "Thailand", phoneCode: "+66" },
  { code: "TR", name: "Turkey", phoneCode: "+90" },
  { code: "AE", name: "United Arab Emirates", phoneCode: "+971" },
  { code: "GB", name: "United Kingdom", phoneCode: "+44" },
  { code: "US", name: "United States", phoneCode: "+1" },
  { code: "VN", name: "Vietnam", phoneCode: "+84" },
];

// Common timezones
export const commonTimezones = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Chicago",
  "America/Toronto",
  "Europe/Berlin",
];

// Initial data for DataContext (empty arrays - data will come from API)
import { Workspace, Requirement, Employee, Client, Task } from '../types/domain';

export const initialWorkspaces: Workspace[] = [];
export const initialRequirements: Requirement[] = [];
export const initialEmployees: Employee[] = [];
export const initialClients: Client[] = [];
export const initialTasks: Task[] = [];
