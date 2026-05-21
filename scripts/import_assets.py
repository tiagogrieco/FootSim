import os
import json
import re
import shutil

clubs_path = "G:/Projetos Python/FootSim/src/data/clubs.json"
fm_kits_dir = "G:/Games/FM26_BrasilMundUp/2d/2d/America do Sul/Brasil"
fm_logos_dir = "G:/Games/FM26_BrasilMundUp/Logos/logos/clubs/normal"

dest_logos_dir = "G:/Projetos Python/FootSim/public/assets/clubs/logos"
dest_kits_dir = "G:/Projetos Python/FootSim/public/assets/clubs/kits"

os.makedirs(dest_logos_dir, exist_ok=True)
os.makedirs(dest_kits_dir, exist_ok=True)

with open(clubs_path, 'r', encoding='utf-8') as f:
    clubs = json.load(f)

# First, map FM IDs to kit files by scanning config.xml
fmid_to_home_kit = {}
fmid_to_away_kit = {}

print("Scanning for kit mappings...")
for root, dirs, files in os.walk(fm_kits_dir):
    if "config.xml" in files:
        config_path = os.path.join(root, "config.xml")
        try:
            with open(config_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                # find home kits
                matches_home = re.findall(r'<record\s+from="([^"]+)"\s+to="graphics/pictures/team/(\d+)/kits/home"/>', content, re.IGNORECASE)
                for filename, fmid in matches_home:
                    fmid_to_home_kit[fmid] = os.path.join(root, filename + ".png")
                
                # find away kits
                matches_away = re.findall(r'<record\s+from="([^"]+)"\s+to="graphics/pictures/team/(\d+)/kits/away"/>', content, re.IGNORECASE)
                for filename, fmid in matches_away:
                    fmid_to_away_kit[fmid] = os.path.join(root, filename + ".png")
        except Exception as e:
            pass

print("Copying assets...")
for club in clubs:
    club_id = str(club['id'])
    club_name = club['name']
    
    if 'fmId' not in club:
        print(f"Warning: No FM ID defined in JSON for {club_name}")
        continue
        
    fmid = str(club['fmId'])
    
    # Copy Logo
    logo_src = os.path.join(fm_logos_dir, f"{fmid}.png")
    logo_dest = os.path.join(dest_logos_dir, f"{club_id}.png")
    if os.path.exists(logo_src):
        shutil.copy2(logo_src, logo_dest)
        print(f"Copied logo for {club_name}")
    else:
        print(f"Logo not found for {club_name} (ID: {fmid})")
        
    # Copy Home Kit
    if fmid in fmid_to_home_kit:
        kit_src = fmid_to_home_kit[fmid]
        kit_dest = os.path.join(dest_kits_dir, f"{club_id}_home.png")
        if os.path.exists(kit_src):
            shutil.copy2(kit_src, kit_dest)
            print(f"Copied home kit for {club_name}")
        else:
            print(f"Home kit file missing for {club_name}: {kit_src}")
    else:
        print(f"No home kit mapping found for {club_name} (ID: {fmid})")

    # Copy Away Kit
    if fmid in fmid_to_away_kit:
        kit_src = fmid_to_away_kit[fmid]
        kit_dest = os.path.join(dest_kits_dir, f"{club_id}_away.png")
        if os.path.exists(kit_src):
            shutil.copy2(kit_src, kit_dest)
            print(f"Copied away kit for {club_name}")
        else:
            print(f"Away kit file missing for {club_name}: {kit_src}")
    else:
        print(f"No away kit mapping found for {club_name} (ID: {fmid})")

print("Asset import complete!")
