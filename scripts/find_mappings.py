import os
import json
import re

clubs_path = "G:/Projetos Python/FootSim/src/data/clubs.json"
fm_kits_dir = "G:/Games/FM26_BrasilMundUp/2d/2d/America do Sul/Brasil"

with open(clubs_path, 'r', encoding='utf-8') as f:
    clubs = json.load(f)

# Common aliases in filenames
club_aliases = {
    "Atlético Mineiro": ["atleticomg", "atletico_mg", "galo"],
    "Palmeiras": ["palmeiras"],
    "Flamengo": ["flameng", "flamengo"],
    "São Paulo": ["saopaulo", "sao_paulo", "spfc"],
    "Internacional": ["internacional", "interrs", "inter_rs"],
    "Grêmio": ["gremio"],
    "Cruzeiro": ["cruzeiro"],
    "Botafogo": ["botafog", "botafogo", "botafogorj"],
    "Corinthians": ["corinthians"],
    "Fluminense": ["fluminens", "fluminense"],
    "Vasco da Gama": ["vasco"],
    "Santos": ["santos"],
    "Sport Recife": ["sport", "sportrecife", "sport_recife"],
    "Ceará": ["ceara"],
    "Goiás": ["goias"],
    "Coritiba": ["coritiba", "coxa"],
    "América Mineiro": ["americamg", "america_mg"],
    "Juventude": ["juventude"],
    "Vila Nova": ["vilanova", "vila_nova"],
    "Novorizontino": ["novorizontino"]
}

# Scan all config.xml in kit states
found_mappings = {}

for root, dirs, files in os.walk(fm_kits_dir):
    if "config.xml" in files:
        config_path = os.path.join(root, "config.xml")
        try:
            with open(config_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                # <record from="flameng_1" to="graphics/pictures/team/322/kits/home"/>
                matches = re.findall(r'<record\s+from="([^"]+)"\s+to="graphics/pictures/team/(\d+)/kits/home"/>', content, re.IGNORECASE)
                
                for filename, fmid in matches:
                    # check if filename matches any of our aliases
                    for club_name, aliases in club_aliases.items():
                        for alias in aliases:
                            if filename.startswith(alias + "_") or filename.startswith(alias):
                                # make sure it's a home kit like _1
                                if club_name not in found_mappings:
                                    found_mappings[club_name] = {
                                        "fmid": fmid,
                                        "home_kit": os.path.join(root, filename + ".png")
                                    }
        except Exception as e:
            print(f"Error reading {config_path}: {e}")

print(json.dumps(found_mappings, indent=2))
