import pandas as pd
import os

# Load the Excel file
file_path = 'RRA_Rating_Engine_Database_v1.xlsx'
xls = pd.ExcelFile(file_path)

# Output SQL file
output_file = '20260217000000_rating_engine_init.sql'

def sanitize_value(val):
    if pd.isna(val):
        return 'NULL'
    if isinstance(val, str):
        # Escape single quotes
        val = val.replace("'", "''")
        return f"'{val}'"
    if isinstance(val, bool):
        return 'TRUE' if val else 'FALSE'
    return str(val)

sql_statements = []

# Order of table creation (respecting dependencies)
tables = [
    'engine_constants',
    'assessment_domains',
    'domain_weights',
    'vccl_regions',
    'vmcu_associations',
    'competition_tiers',
    'eligibility_rules'
]

# Drop tables in reverse order
for table in reversed(tables):
    sql_statements.append(f"DROP TABLE IF EXISTS public.{table} CASCADE;")

sql_statements.append("\n")

# --- 1. engine_constants ---
sql_statements.append("""
CREATE TABLE public.engine_constants (
    constant_key text PRIMARY KEY,
    value text,
    data_type text,
    owner text,
    review_cadence text,
    description text
);
""")
df = pd.read_excel(xls, 'engine_constants', header=3)
for _, row in df.iterrows():
    if pd.isna(row['constant_key']): continue
    vals = [sanitize_value(row[c]) for c in ['constant_key', 'value', 'data_type', 'owner', 'review_cadence', 'description']]
    sql_statements.append(f"INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 2. assessment_domains ---
sql_statements.append("""
CREATE TABLE public.assessment_domains (
    domain_id text PRIMARY KEY,
    domain_name text,
    data_tier text,
    source_page text,
    item_count text,
    feeds_algorithm boolean,
    notes text
);
""")
df = pd.read_excel(xls, 'assessment_domains', header=3)
for _, row in df.iterrows():
    if pd.isna(row['domain_id']): continue
    vals = [sanitize_value(row[c]) for c in ['domain_id', 'domain_name', 'data_tier', 'source_page', 'item_count', 'feeds_algorithm', 'notes']]
    sql_statements.append(f"INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 3. domain_weights ---
sql_statements.append("""
CREATE TABLE public.domain_weights (
    role_id text PRIMARY KEY,
    role_label text,
    technical_weight numeric,
    game_iq_weight numeric,
    mental_weight numeric,
    physical_weight numeric,
    phase_weight numeric,
    notes text
);
""")
df = pd.read_excel(xls, 'domain_weights', header=3)
col_map_weights = {
    'role_id': 'role_id',
    'role_label': 'role_label',
    'technical_weight': 'technical_weight',
    'game_iq_weight': 'game_iq_weight',
    'mental_weight': 'mental_weight',
    'physical_weight': 'physical_weight',
    'phase_weight': 'phase_weight',
    'notes': 'notes'
}
for _, row in df.iterrows():
    if pd.isna(row['role_id']): continue
    # Normalize column names just in case (strip spaces)
    row.index = row.index.str.strip()
    vals = []
    # Check if 'game_iq_weight' exists or 'game_intelligence_weight' etc.
    # Printing cols showed 'game_iq_weight' directly. 
    # But let's be safe and use get with default or check
    for c in ['role_id', 'role_label', 'technical_weight', 'game_iq_weight', 'mental_weight', 'physical_weight', 'phase_weight', 'notes']:
        vals.append(sanitize_value(row.get(c)))
    sql_statements.append(f"INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 4. vccl_regions ---
sql_statements.append("""
CREATE TABLE public.vccl_regions (
    region_code text PRIMARY KEY,
    region_name text,
    associations text,
    linked_premier_club text,
    has_direct_pathway boolean
);
""")
df = pd.read_excel(xls, 'vccl_regions', header=3)
for _, row in df.iterrows():
    if pd.isna(row['region_code']): continue
    vals = [sanitize_value(row[c]) for c in ['region_code', 'region_name', 'associations', 'linked_premier_club', 'has_direct_pathway']]
    sql_statements.append(f"INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 5. vmcu_associations ---
sql_statements.append("""
CREATE TABLE public.vmcu_associations (
    abbrev text PRIMARY KEY,
    full_name text,
    type text,
    surface text,
    region_notes text
);
""")
df = pd.read_excel(xls, 'vmcu_associations', header=3)
for _, row in df.iterrows():
    if pd.isna(row['abbrev']): continue
    vals = [sanitize_value(row[c]) for c in ['abbrev', 'full_name', 'type', 'surface', 'region_notes']]
    sql_statements.append(f"INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 6. competition_tiers ---
sql_statements.append("""
CREATE TABLE public.competition_tiers (
    code text PRIMARY KEY,
    tier text,
    competition_name text,
    shield_name text,
    gender text,
    age_group text,
    format text,
    cti_value numeric,
    expected_midpoint_age numeric,
    arm_sensitivity numeric,
    active boolean,
    notes text
);
""")
df = pd.read_excel(xls, 'competition_tiers', header=3)
columns_map = {
    'code': 'code',
    'tier': 'tier',
    'competition_name': 'competition_name',
    'shield_name': 'shield_name',
    'gender': 'gender',
    'age_group': 'age_group',
    'format': 'format',
    'cti_value': 'cti_value',
    'expected_midpoint_age': 'expected_midpoint_age',
    'arm_sensitivity': 'arm_sensitivity',
    'active': 'active',
    'notes': 'notes'
}

for _, row in df.iterrows():
    if pd.isna(row['code']): continue
    vals = []
    for db_col in columns_map.keys():
        excel_col = columns_map[db_col]
        val = row.get(excel_col)
        vals.append(sanitize_value(val))
    
    sql_statements.append(f"INSERT INTO public.competition_tiers ({', '.join(columns_map.keys())}) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# --- 7. eligibility_rules ---
sql_statements.append("""
CREATE TABLE public.eligibility_rules (
    competition_code text PRIMARY KEY REFERENCES public.competition_tiers(code),
    competition_name text,
    eligibility text,
    excluded_from text,
    source text
);
""")
df = pd.read_excel(xls, 'eligibility_rules', header=3)
for _, row in df.iterrows():
    if pd.isna(row['competition_code']): continue
    vals = [sanitize_value(row[c]) for c in ['competition_code', 'competition_name', 'eligibility', 'excluded_from', 'source']]
    sql_statements.append(f"INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ({', '.join(vals)});")
sql_statements.append("\n")


# Write to file
with open(output_file, 'w') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated {output_file}")
