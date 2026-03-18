


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_current_hospital_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN COALESCE(
    (SELECT id FROM hospitals WHERE id = auth.uid()),
    (SELECT hospital_id FROM doctors WHERE id = auth.uid()),
    (SELECT hospital_id FROM staff WHERE id = auth.uid())
  );
END;
$$;


ALTER FUNCTION "public"."get_current_hospital_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "floor_id" "uuid",
    "bed_number" integer NOT NULL,
    "admit_time" timestamp with time zone DEFAULT "now"(),
    "discharge_time" timestamp with time zone
);


ALTER TABLE "public"."admissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hospital_id" "uuid",
    "name" "text" NOT NULL,
    "arrival_rate" double precision DEFAULT 0
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "id" "uuid" NOT NULL,
    "dr_id" "text" NOT NULL,
    "hospital_id" "uuid",
    "dept_id" "uuid",
    "is_clocked_in" boolean DEFAULT false,
    "service_time" integer DEFAULT 10
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."floors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hospital_id" "uuid",
    "floor_number" integer NOT NULL,
    "total_beds" integer NOT NULL
);


ALTER TABLE "public"."floors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hospitals" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "global_service_time" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hospitals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hospital_id" "uuid",
    "dept_id" "uuid",
    "name" "text" NOT NULL,
    "is_emergency" boolean DEFAULT false,
    "status" "text" DEFAULT 'waiting'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "current_floor_id" "uuid",
    "patient_type" "text" DEFAULT 'IP'::"text",
    CONSTRAINT "op_no_bed" CHECK (((("patient_type" = 'OP'::"text") AND ("current_floor_id" IS NULL)) OR ("patient_type" = 'IP'::"text"))),
    CONSTRAINT "op_no_emergency" CHECK (((("patient_type" = 'OP'::"text") AND ("is_emergency" = false)) OR ("patient_type" = 'IP'::"text"))),
    CONSTRAINT "patients_patient_type_check" CHECK (("patient_type" = ANY (ARRAY['IP'::"text", 'OP'::"text"]))),
    CONSTRAINT "patients_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'admitted'::"text", 'discharged'::"text"])))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" NOT NULL,
    "hospital_id" "uuid",
    "role" "text" DEFAULT 'reception'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_floor_id_bed_number_key" UNIQUE ("floor_id", "bed_number");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_hospital_id_name_key" UNIQUE ("hospital_id", "name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_dr_id_key" UNIQUE ("dr_id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."floors"
    ADD CONSTRAINT "floors_hospital_id_floor_number_key" UNIQUE ("hospital_id", "floor_number");



ALTER TABLE ONLY "public"."floors"
    ADD CONSTRAINT "floors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hospitals"
    ADD CONSTRAINT "hospitals_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hospitals"
    ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."floors"
    ADD CONSTRAINT "floors_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hospitals"
    ADD CONSTRAINT "hospitals_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_current_floor_id_fkey" FOREIGN KEY ("current_floor_id") REFERENCES "public"."floors"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE "public"."admissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admissions_manager_staff_all" ON "public"."admissions" USING ((EXISTS ( SELECT 1
   FROM "public"."patients"
  WHERE (("patients"."id" = "admissions"."patient_id") AND ("patients"."patient_type" = 'IP'::"text") AND ("patients"."hospital_id" = "public"."get_current_hospital_id"())))));



CREATE POLICY "anyone_can_insert_doctors" ON "public"."doctors" FOR INSERT WITH CHECK (true);



CREATE POLICY "anyone_can_insert_staff" ON "public"."staff" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dept_manager_all" ON "public"."departments" USING (("hospital_id" = "auth"."uid"()));



CREATE POLICY "dept_staff_read" ON "public"."departments" FOR SELECT USING (("hospital_id" = "public"."get_current_hospital_id"()));



CREATE POLICY "doctor_update_self" ON "public"."doctors" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."doctors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doctors_view_self" ON "public"."doctors" FOR SELECT USING (("hospital_id" = "public"."get_current_hospital_id"()));



CREATE POLICY "floor_manager_all" ON "public"."floors" USING (("hospital_id" = "auth"."uid"()));



CREATE POLICY "floor_staff_read" ON "public"."floors" FOR SELECT USING (("hospital_id" = "public"."get_current_hospital_id"()));



ALTER TABLE "public"."floors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hospital_full_access_manager" ON "public"."hospitals" USING (("id" = "auth"."uid"()));



CREATE POLICY "hospital_read_staff" ON "public"."hospitals" FOR SELECT USING (("id" = "public"."get_current_hospital_id"()));



ALTER TABLE "public"."hospitals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "managers_manage_staff" ON "public"."staff" USING (("hospital_id" = "auth"."uid"()));



CREATE POLICY "patient_manager_staff_all" ON "public"."patients" USING (("hospital_id" = "public"."get_current_hospital_id"()));



ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_read_own_record" ON "public"."staff" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "staff_self_read" ON "public"."staff" FOR SELECT USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_current_hospital_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_hospital_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_hospital_id"() TO "service_role";


















GRANT ALL ON TABLE "public"."admissions" TO "anon";
GRANT ALL ON TABLE "public"."admissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admissions" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."doctors" TO "anon";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors" TO "service_role";



GRANT ALL ON TABLE "public"."floors" TO "anon";
GRANT ALL ON TABLE "public"."floors" TO "authenticated";
GRANT ALL ON TABLE "public"."floors" TO "service_role";



GRANT ALL ON TABLE "public"."hospitals" TO "anon";
GRANT ALL ON TABLE "public"."hospitals" TO "authenticated";
GRANT ALL ON TABLE "public"."hospitals" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


