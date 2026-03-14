"""
FraudShield — Step 1: Synthetic Dataset Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generates:
data/claims.csv         → 9,900 insurance claims
data/network_edges.csv  → provider-patient connections (for Network Graph)
data/decisions.csv      → empty log (for Active Learning)
data/providers.csv      → provider master reference (for Manual Checker)
"""

import pandas as pd
import numpy as np
import random, os, json
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

for d in ["data","models","outputs"]:
    os.makedirs(d, exist_ok=True)

# ─────────────────────────────────────────
# REFERENCE DATA
# ─────────────────────────────────────────
NAMES = [
    "Ramesh Kumar","Priya Sharma","Anjali Singh","Vikram Patel",
    "Sunita Rao","Arjun Mehta","Kavitha Nair","Rohit Joshi",
    "Meena Iyer","Suresh Pillai","Deepa Reddy","Anil Gupta",
    "Pooja Verma","Rajesh Shah","Lakshmi Bai","Kiran Desai",
    "Mohan Das","Usha Tiwari","Sanjay Patil","Rekha Menon",
    "Harish Choudhary","Anita Saxena","Ravi Krishnan","Sneha Kulkarni",
]
CITIES = ["Mumbai","Delhi","Bangalore","Chennai","Hyderabad",
          "Pune","Kolkata","Ahmedabad","Jaipur","Lucknow"]
PLANS  = ["Basic","Standard","Premium","Corporate"]
GENDERS= ["Male","Female"]

# provider_id → (name, specialization, city, avg_daily, is_fraudulent, ring)
PROVIDERS = {
    "DR001": ("Dr. Rajiv Shah",      "Cardiologist",  "Mumbai",    8,  False, None),
    "DR002": ("Dr. Priya Mehta",     "Orthopedic",    "Delhi",     6,  False, None),
    "DR003": ("Dr. Arun Nair",       "Neurologist",   "Bangalore", 5,  False, None),
    "DR004": ("Dr. Sunita Reddy",    "Gynecologist",  "Chennai",   7,  False, None),
    "DR005": ("Dr. Vijay Patel",     "General",       "Pune",      9,  False, None),
    "DR006": ("Dr. Kavya Iyer",      "Dermatologist", "Hyderabad", 4,  False, None),
    "DR007": ("Dr. Mohan Gupta",     "Cardiologist",  "Kolkata",   6,  False, None),
    "DR008": ("Dr. Neha Sharma",     "Pediatrician",  "Ahmedabad", 8,  False, None),
    "DR009": ("Dr. Ramesh Fraud",    "General",       "Mumbai",    52, True,  None),
    "DR010": ("Dr. Ghost Biller",    "Orthopedic",    "Delhi",     48, True,  None),
    "DR011": ("Dr. Fake Claims",     "Cardiologist",  "Bangalore", 61, True,  None),
    "LAB001":("LabXYZ Diagnostics",  "Laboratory",    "Mumbai",    45, True,  None),
    "LAB002":("QuickTest Labs",      "Laboratory",    "Delhi",     38, True,  None),
    "DR012": ("Dr. Ring Leader",     "General",       "Mumbai",    55, True,  "RING_A"),
    "DR013": ("Dr. Ring Member A",   "Orthopedic",    "Mumbai",    42, True,  "RING_A"),
    "LAB003":("Ring Lab Services",   "Laboratory",    "Mumbai",    50, True,  "RING_A"),
    "DR014": ("Dr. Shadow Doc",      "Neurologist",   "Delhi",     47, True,  "RING_B"),
    "DR015": ("Dr. Phantom Bills",   "General",       "Delhi",     44, True,  "RING_B"),
    "LAB004":("Ghost Diagnostics",   "Laboratory",    "Delhi",     39, True,  "RING_B"),
}

LEGIT   = [k for k,v in PROVIDERS.items() if not v[4]]
FRAUD   = [k for k,v in PROVIDERS.items() if v[4] and not v[5]]
RING_A  = [k for k,v in PROVIDERS.items() if v[5]=="RING_A"]
RING_B  = [k for k,v in PROVIDERS.items() if v[5]=="RING_B"]

PROCEDURES = {
    "ECG Test":                  (18,90,(1500,  3500), "cardiac",  "I25"),
    "Blood Test - Basic":        (0, 90,(300,   800),  "lab",      "Z00"),
    "Blood Test - Comprehensive":(18,90,(1500,  3000), "lab",      "Z13"),
    "X-Ray":                     (5, 90,(800,   2000), "radiology","M54"),
    "MRI Scan":                  (10,90,(8000,  18000),"radiology","G35"),
    "CT Scan":                   (10,90,(6000,  15000),"radiology","S72"),
    "Hip Replacement":           (45,85,(80000, 150000),"surgery", "M16"),
    "Knee Replacement":          (40,85,(70000, 130000),"surgery", "M17"),
    "Appendectomy":              (10,70,(40000, 80000), "surgery", "K35"),
    "Cataract Surgery":          (50,90,(25000, 60000), "surgery", "H26"),
    "Dental Extraction":         (10,90,(500,   2000),  "dental",  "K08"),
    "Consultation - General":    (0, 90,(300,   800),   "consult", "Z01"),
    "Consultation - Specialist": (0, 90,(800,   2000),  "consult", "Z01"),
    "Physiotherapy":             (15,90,(600,   1500),  "therapy", "M79"),
    "Dialysis":                  (20,90,(3000,  8000),  "treatment","N18"),
    "Chemotherapy":              (20,90,(50000, 120000),"treatment","C34"),
    "Normal Delivery":           (18,45,(30000, 70000), "maternity","Z34"),
    "C-Section":                 (18,45,(50000, 100000),"maternity","O82"),
    "Angioplasty":               (40,85,(150000,350000),"cardiac", "I21"),
    "Bypass Surgery":            (45,85,(200000,500000),"cardiac", "I25"),
}

def rdate(days_ago=365):
    base = datetime.now()-timedelta(days=days_ago)
    return (base+timedelta(days=random.randint(0,days_ago))).strftime("%Y-%m-%d")

def normal_cost(proc):
    lo,hi = PROCEDURES[proc][2]
    return round(np.random.uniform(lo,hi),-1)

def valid_proc(age):
    valid=[p for p,v in PROCEDURES.items() if v[0]<=age<=v[1]]
    return random.choice(valid) if valid else "Consultation - General"

ctr=1
claims=[]
edges=[]
edge_set=set()

def add_edge(src,tgt,etype,weight=1):
    key=tuple(sorted([str(src),str(tgt)]))
    if key not in edge_set:
        edge_set.add(key)
        edges.append({"source":src,"target":tgt,"type":etype,"weight":weight})

def claim(pid,pname,page,pgender,prov_id,proc,amt,date,flabel,ftype,rscore,expl=""):
    global ctr
    pv=PROVIDERS[prov_id]
    row={
        "claim_id":f"CLM_{ctr:05d}","patient_id":pid,"patient_name":pname,
        "patient_age":page,"patient_gender":pgender,"patient_city":random.choice(CITIES),
        "provider_id":prov_id,"provider_name":pv[0],"provider_type":pv[1],
        "provider_city":pv[2],"procedure":proc,"claim_amount":amt,
        "claim_date":date,"diagnosis_code":PROCEDURES[proc][4],
        "insurance_plan":random.choice(PLANS),"fraud_label":flabel,
        "fraud_type":ftype,"risk_score":rscore,"explanation":expl,
    }
    ctr+=1
    return row

# Build patient pool
NUM_PAT=1000
patients=[]
for i in range(NUM_PAT):
    name=f"{random.choice(NAMES)} {i}"
    r=random.random()
    if r<0.15:   age=random.randint(1,20)
    elif r<0.45: age=random.randint(21,45)
    elif r<0.75: age=random.randint(46,65)
    else:        age=random.randint(66,90)
    patients.append((f"PAT_{i:04d}",name,age,random.choice(GENDERS)))

print("="*55)
print("  FraudShield — Data Generator v2.0")
print("="*55)

# 1. Legitimate (8100)
print("\n[1/7] Legitimate claims (8100)...")
for _ in range(8100):
    pid,pname,page,pgender=random.choice(patients)
    pv=random.choice(LEGIT)
    proc=valid_proc(page)
    c=claim(pid,pname,page,pgender,pv,proc,normal_cost(proc),
            rdate(),0,"None",round(random.uniform(2,22),1))
    claims.append(c)
    add_edge(pid,pv,"consultation",1)

# 2. Inflated Billing (300)
print("[2/7] Inflated Billing (300)...")
cheap=["ECG Test","Blood Test - Basic","X-Ray","Consultation - General","Physiotherapy"]
for _ in range(300):
    pid,pname,page,pgender=random.choice(patients)
    pv=random.choice(FRAUD)
    proc=random.choice(cheap)
    n=normal_cost(proc)
    inf=round(n*random.uniform(10,50),-2)
    expl=(f"Cost ₹{inf:,.0f} is {inf/n:.0f}x above avg ₹{n:,.0f} | "
          f"Provider has repeated overbilling history")
    c=claim(pid,pname,page,pgender,pv,proc,inf,rdate(),
            1,"Inflated Billing",round(random.uniform(78,97),1),expl)
    claims.append(c)
    add_edge(pid,pv,"fraud_billing",3)

# 3. Ghost Patient (200)
print("[3/7] Ghost Patients (200)...")
adult=["Hip Replacement","Knee Replacement","Bypass Surgery",
       "Angioplasty","Chemotherapy","Cataract Surgery"]
for _ in range(200):
    gid=f"PAT_GHOST_{random.randint(1000,9999)}"
    gname=f"Ghost Patient {random.randint(100,999)}"
    gage=random.randint(5,22)
    pv=random.choice(FRAUD)
    proc=random.choice(adult)
    expl=(f"Age {gage} is unusual for '{proc}' | "
          f"No prior claim history | Provider high-volume suspect")
    c=claim(gid,gname,gage,random.choice(GENDERS),pv,proc,
            normal_cost(proc),rdate(),1,"Ghost Patient",
            round(random.uniform(80,96),1),expl)
    claims.append(c)
    add_edge(gid,pv,"ghost_patient",4)

# 4. Duplicate (200)
print("[4/7] Duplicate Claims (200)...")
legit_pool=[c for c in claims if c["fraud_label"]==0]
for _ in range(200):
    orig=random.choice(legit_pool).copy()
    od=datetime.strptime(orig["claim_date"],"%Y-%m-%d")
    nd=(od+timedelta(days=random.randint(1,6))).strftime("%Y-%m-%d")
    days=(datetime.strptime(nd,"%Y-%m-%d")-od).days
    expl=(f"Same procedure '{orig['procedure']}' claimed {days} days ago | "
          f"Same patient+provider combination")
    c=claim(orig["patient_id"],orig["patient_name"],orig["patient_age"],
            orig["patient_gender"],orig["provider_id"],orig["procedure"],
            orig["claim_amount"],nd,1,"Duplicate Claim",
            round(random.uniform(72,90),1),expl)
    claims.append(c)
    add_edge(orig["patient_id"],orig["provider_id"],"duplicate",2)

# 5. Age Mismatch (150)
print("[5/7] Age Mismatch (150)...")
for _ in range(150):
    pid,pname,_,pgender=random.choice(patients)
    wa=random.randint(2,14)
    pv=random.choice(FRAUD)
    proc=random.choice(["Hip Replacement","Bypass Surgery",
                        "Angioplasty","Knee Replacement","Cataract Surgery"])
    expl=(f"Age {wa} is far below minimum age for '{proc}' | "
          f"Statistically impossible — likely fabricated claim")
    c=claim(pid,pname,wa,pgender,pv,proc,normal_cost(proc),
            rdate(),1,"Age-Procedure Mismatch",
            round(random.uniform(70,88),1),expl)
    claims.append(c)
    add_edge(pid,pv,"age_mismatch",3)

# 6. Volume Spike (250)
print("[6/7] Volume Spike (250)...")
spike_date=rdate(30)
for _ in range(250):
    pid,pname,page,pgender=random.choice(patients)
    pv=random.choice(FRAUD)
    proc=valid_proc(page)
    expl=(f"Provider submitted 50+ claims today vs avg 8/day | "
          f"Bulk billing pattern on {spike_date}")
    c=claim(pid,pname,page,pgender,pv,proc,normal_cost(proc),
            spike_date,1,"Provider Volume Spike",
            round(random.uniform(65,85),1),expl)
    claims.append(c)
    add_edge(pid,pv,"volume_spike",2)

# 7. Fraud Rings (550)
print("[7/7] Fraud Rings Ring A+B (550)...")
ring_pats=random.sample(patients,30)
ring_procs=["Consultation - Specialist","Blood Test - Comprehensive",
            "MRI Scan","CT Scan","Physiotherapy"]

for _ in range(300):  # Ring A
    pid,pname,page,pgender=random.choice(ring_pats[:15])
    pv=random.choice(RING_A)
    proc=random.choice(ring_procs)
    n=normal_cost(proc)
    amt=round(n*random.uniform(2,4),-2)
    expl=(f"Circular referral — {PROVIDERS[pv][0]} in Ring A | "
          f"Patient in 10+ ring claims | Amount {amt/n:.1f}x inflated")
    c=claim(pid,pname,page,pgender,pv,proc,amt,rdate(),
            1,"Fraud Ring",round(random.uniform(82,99),1),expl)
    claims.append(c)
    nxt=RING_A[(RING_A.index(pv)+1)%len(RING_A)]
    add_edge(pv,nxt,"ring_referral",5)
    add_edge(pid,pv,"ring_patient",4)

for _ in range(250):  # Ring B
    pid,pname,page,pgender=random.choice(ring_pats[15:])
    pv=random.choice(RING_B)
    proc=random.choice(ring_procs)
    n=normal_cost(proc)
    amt=round(n*random.uniform(1.8,3.5),-2)
    expl=(f"Circular referral — {PROVIDERS[pv][0]} in Ring B | "
          f"Network analysis flagged this cluster")
    c=claim(pid,pname,page,pgender,pv,proc,amt,rdate(),
            1,"Fraud Ring",round(random.uniform(78,97),1),expl)
    claims.append(c)
    nxt=RING_B[(RING_B.index(pv)+1)%len(RING_B)]
    add_edge(pv,nxt,"ring_referral",5)
    add_edge(pid,pv,"ring_patient",4)

# ─────────────────────────────────────────
# SAVE ALL FILES
# ─────────────────────────────────────────
df=pd.DataFrame(claims)
df=df.sample(frac=1,random_state=42).reset_index(drop=True)
df.to_csv("data/claims.csv",index=False)

pd.DataFrame(edges).to_csv("data/network_edges.csv",index=False)

prov_rows=[{
    "provider_id":pid,"provider_name":v[0],"specialization":v[1],
    "city":v[2],"avg_daily":v[3],"is_fraudulent":v[4],
    "fraud_ring":v[5] or "None",
} for pid,v in PROVIDERS.items()]
pd.DataFrame(prov_rows).to_csv("data/providers.csv",index=False)

pd.DataFrame(columns=[
    "decision_id","claim_id","decision","reason","timestamp","used_for_training"
]).to_csv("data/decisions.csv",index=False)

# procedure stats for manual checker
proc_stats={}
for proc in PROCEDURES:
    subset=df[df["procedure"]==proc]["claim_amount"]
    if len(subset):
        proc_stats[proc]={"mean":float(subset.mean()),
                          "std":float(subset.std()),"count":int(len(subset))}
with open("data/procedure_stats.json","w") as f:
    json.dump(proc_stats,f,indent=2)

total=len(df)
ftotal=int(df["fraud_label"].sum())
ltotal=total-ftotal

print("\n"+"="*55)
print("  DATASET COMPLETE")
print("="*55)
print(f"  Total Claims     : {total:,}")
print(f"  Legitimate       : {ltotal:,}  ({ltotal/total*100:.1f}%)")
print(f"  Fraudulent       : {ftotal:,}  ({ftotal/total*100:.1f}%)")
print(f"  Network Edges    : {len(edges):,}")
print(f"\n  Fraud Breakdown:")
for ft,cnt in df[df["fraud_label"]==1]["fraud_type"].value_counts().items():
    print(f"    • {ft:<30} {cnt:>4}")
print(f"\n  ✅ data/claims.csv            ({total:,} rows)")
print(f"  ✅ data/network_edges.csv     ({len(edges):,} edges)")
print(f"  ✅ data/providers.csv         ({len(PROVIDERS)} providers)")
print(f"  ✅ data/decisions.csv         (empty log)")
print(f"  ✅ data/procedure_stats.json  (for manual checker)")
print("="*55)
