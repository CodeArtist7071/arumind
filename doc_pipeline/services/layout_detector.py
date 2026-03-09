import layoutparser as lp
import cv2

model = lp.Detectron2LayoutModel(
    config_path="lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
    label_map={
        0: "Text",
        1: "Title",
        2: "List",
        3: "Table",
        4: "Figure"
    }
)


def detect_text_regions(image_path):

    image = cv2.imread(image_path)

    layout = model.detect(image)

    text_blocks = []

    for block in layout:
        if block.type in ["Text", "List"]:
            x1, y1, x2, y2 = map(int, block.coordinates)
            crop = image[y1:y2, x1:x2]
            text_blocks.append(crop)

    return text_blocks