export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      mockups: {
        Row: {
          id: string;
          url: string;
          filename: string;
          design_id: string | null;
          version: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          filename: string;
          design_id?: string | null;
          version?: number | null;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          filename?: string;
          design_id?: string | null;
          version?: number | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          mockup_id: string;
          voter: "Ryan" | "Jackson";
          liked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          mockup_id: string;
          voter: "Ryan" | "Jackson";
          liked: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          mockup_id?: string;
          voter?: "Ryan" | "Jackson";
          liked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_mockup_id_fkey";
            columns: ["mockup_id"];
            isOneToOne: true;
            referencedRelation: "mockups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_undecided_mockups: {
        Args: { batch_limit?: number };
        Returns: Database["public"]["Tables"]["mockups"]["Row"][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Mockup = Database["public"]["Tables"]["mockups"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];

export type MockupWithVote = Mockup & {
  votes: Pick<Vote, "voter" | "liked" | "created_at"> | null;
};
