import os
import json

def cube(ox, oy, oz, w, h, d, vi):
    verts = [
        (ox-w/2, oy, oz-d/2),
        (ox+w/2, oy, oz-d/2),
        (ox-w/2, oy+h, oz-d/2),
        (ox+w/2, oy+h, oz-d/2),
        (ox-w/2, oy, oz+d/2),
        (ox+w/2, oy, oz+d/2),
        (ox-w/2, oy+h, oz+d/2),
        (ox+w/2, oy+h, oz+d/2),
    ]
    faces = [
        (1, 2, 4, 3), # front
        (5, 7, 8, 6), # back
        (1, 5, 6, 2), # bottom
        (3, 4, 8, 7), # top
        (1, 3, 7, 5), # left
        (2, 6, 8, 4), # right
    ]
    v_str = "".join([f"v {x} {y} {z}\n" for x,y,z in verts])
    f_str = "".join([f"f {a+vi} {b+vi} {c+vi} {d+vi}\n" for a,b,c,d in faces])
    return v_str, f_str, vi + 8

def generate_obj(filename, parts):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        vi = 0
        all_v = ""
        all_f = ""
        for p in parts:
            if p[0] == "cube":
                v, fc, vi = cube(p[1], p[2], p[3], p[4], p[5], p[6], vi)
                all_v += v
                all_f += fc
        f.write(all_v + "\n" + all_f)

def run():
    models = {
        "tree_oak": {"file": "res/models/tree_oak.obj", "color": 0x3a7d34},
        "tree_pine": {"file": "res/models/tree_pine.obj", "color": 0x1b5e20},
        "tree_birch": {"file": "res/models/tree_birch.obj", "color": 0x9ccc65},
        "tree_dead": {"file": "res/models/tree_dead.obj", "color": 0x4e4e4e},
        "tree_autumn": {"file": "res/models/tree_autumn.obj", "color": 0xd95a2b},
        "plant_bush": {"file": "res/models/plant_bush.obj", "color": 0x689f38},
        "plant_grass": {"file": "res/models/plant_grass.obj", "color": 0x7cb342},
        "plant_mushroom": {"file": "res/models/plant_mushroom.obj", "color": 0xd32f2f},
        "plant_cattail": {"file": "res/models/plant_cattail.obj", "color": 0x5d4037},
        "plant_lilypad": {"file": "res/models/plant_lilypad.obj", "color": 0x4caf50},
        "house_lvl1": {"file": "res/models/house_lvl1.obj", "color": 0xe2c792},
        "char_human": {"file": "res/models/char_human.obj", "color": 0xffcccc},
        "animal_deer": {"file": "res/models/animal_deer.obj", "color": 0xccb8a0},
        "animal_wolf": {"file": "res/models/animal_wolf.obj", "color": 0x223355},
        "animal_fox": {"file": "res/models/animal_fox.obj", "color": 0xd35400},
        "animal_bird": {"file": "res/models/animal_bird.obj", "color": 0x2980b9}
    }

    # Generate very simple cube placeholders for all
    for key, data in models.items():
        generate_obj(data["file"], [("cube", 0, 0, 0, 1, 2, 1)])

    with open("res/models.json", "w", encoding="utf-8") as f:
        json.dump(models, f, indent=4)

if __name__ == "__main__":
    run()
