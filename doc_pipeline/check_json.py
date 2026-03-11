import json
with open('outputs/questions.json') as f:
    d = json.load(f)
    print("Found diagram=true:", len([x for x in d if x.get('diagram_present')]))
    print("Found url:", len([x for x in d if x.get('diagram_url')]))
