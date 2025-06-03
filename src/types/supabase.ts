export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      owners: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          menu_id: string;
          restaurant_id: string;
        };
      };
      menus: {
        Row: {
          id: string;
          name: string;
          restaurant_id: string;
        };
      };
    };
    Functions: {
      get_top_menus: {
        Args: { restaurant_id: string };
        Returns: Array<{
          menu_id: string;
          name: string;
          total_reviews: number;
        }>;
      };
    };
  };
};
