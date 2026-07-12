// ---- FLAT·SIX knowledge-base contract ----
// Shared types for the 981 knowledge base that powers the RAG assistant and
// the MCP fault-code / spec / parts lookups. An MCP agent codes against these
// exact interfaces — do not rename fields.

export type Severity = 'LOW' | 'MED' | 'HIGH';
export type KnowledgeKind = 'fault' | 'spec' | 'maintenance' | 'issue' | 'article';

export interface FaultCode {
  code: string;            // OBD-II (e.g. "P0301") or 6-digit Porsche/UDS hex (e.g. "89020E")
  title: string;
  system: string;          // Engine|Brakes|Cooling|Transmission|HVAC|Electrical|Fuel|Steering|Exhaust|Suspension|Body
  severity: Severity;
  description: string;
  symptoms: string[];
  causes: string[];
  diagnosis: string[];     // ordered checks
  relatedParts?: string[];
  appliesTo?: string[];    // e.g. ["2.7","3.4 S","PDK"]
  source?: string;
}

export interface Spec {
  id: string;
  category: 'torque' | 'fluid' | 'capacity' | 'tolerance' | 'electrical' | 'tyre';
  name: string;            // "Wheel bolt", "Engine oil capacity"
  value: string;           // "130 Nm", "7.5 L"
  notes?: string;
  appliesTo?: string[];
  source?: string;
}

export interface MaintenanceItem {
  id: string;
  task: string;
  intervalMiles?: number;
  intervalMonths?: number;
  system: string;
  notes?: string;
  source?: string;
}

export interface KnownIssue {
  id: string;
  title: string;
  system: string;
  severity: Severity;
  affected: string;        // which engines/years/trans affected
  symptoms: string[];
  description: string;
  fix: string;
  estCost?: string;
  source?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  tags: string[];
  body: string;            // markdown, a few hundred words, self-contained
}

export interface KnowledgeChunk {
  id: string;
  source: string;          // originating id/file
  kind: KnowledgeKind;
  title: string;
  text: string;            // searchable + returnable text
  score?: number;
}
