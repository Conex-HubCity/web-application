"""Convert the rendered public homepage into standalone, framework-free HTML."""
import html
import sys
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlparse

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag, attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def has(self, name):
        return name in (self.attrs.get("class") or "").split()


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Element("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def find(node, predicate):
    if isinstance(node, Element):
        if predicate(node):
            return node
        for child in node.children:
            found = find(child, predicate)
            if found:
                return found


def replace_text(node, text):
    node.children = [text] + [child for child in node.children if isinstance(child, Element)]


def transform(node):
    if isinstance(node, str):
        return node
    if node.tag in {"script", "style", "link", "template"} or node.has("welcome-existing") or node.has("cnx-final-login") or node.has("cnx-language-select"):
        return None
    href = node.attrs.get("href", "")
    if href in {"/fr", "/en"}:
        href = "/"
    elif href.startswith(("/fr/", "/en/")):
        href = href[3:]
    if node.tag == "a" and href.startswith(("/connexion", "/espace", "/compte")):
        return None
    if node.tag == "a" and href.startswith("/inscription/"):
        role = "mentor" if href.endswith("mentor") else "porteur"
        node.attrs.update(href="#comment-ca-marche", **{"data-journey": role})
        if node.has("cnx-pathway-card"):
            label = find(node, lambda child: child.has("cnx-pathway-link"))
            replace_text(label, "Découvrir ce parcours ")
        elif node.has("cnx-inline-link"):
            node.attrs.pop("data-journey")
            node.attrs["href"] = "#questions-frequentes"
            replace_text(node, "Consulter les questions fréquentes ")
        else:
            replace_text(node, "Découvrir le mentorat " if role == "mentor" else "Je porte un projet ")
    elif node.tag == "a" and href == "/":
        node.attrs["href"] = "./index.html"
    if node.tag == "img":
        src = node.attrs.get("src", "")
        if src.startswith("/_next/image"):
            src = parse_qs(urlparse(src).query)["url"][0]
        if not src.startswith("/assets/conex/"):
            raise ValueError(f"Unexpected image source: {src}")
        node.attrs["src"] = "./assets/" + src.rsplit("/", 1)[-1]
        if src.endswith("/hubcity-wordmark.png"):
            node.attrs.update(width="176", height="63")
        for key in ("srcset", "sizes", "data-nimg"):
            node.attrs.pop(key, None)
    if node.has("cnx-journey-switch"):
        buttons = [child for child in node.children if isinstance(child, Element) and child.tag == "button"]
        for button, role in zip(buttons, ("porteur", "mentor")):
            button.attrs["data-journey"] = role
    if node.has("welcome-prerequisite"):
        paragraph = find(node, lambda child: child.tag == "p")
        paragraph.children = ["La certification WoeAcademy Niveau Rouge est nécessaire pour valider le profil des porteurs de projet. Le projet fait ensuite l’objet d’une validation distincte."]
    if node.has("cnx-pathway-footnote"):
        replace_text(node, "La certification du porteur et la validation du projet sont deux étapes distinctes. ")
    node.attrs = {key: value for key, value in node.attrs.items() if not key.startswith("on")}
    node.children = [result for child in node.children if (result := transform(child)) is not None]
    return node


def render(node):
    if isinstance(node, str):
        return html.escape(node, quote=False)
    attrs = "".join(" " + key + ("" if value is None else '="' + html.escape(value, quote=True) + '"') for key, value in node.attrs.items())
    opening = "<" + node.tag + attrs + ">"
    return opening if node.tag in VOID else opening + "".join(map(render, node.children)) + "</" + node.tag + ">"


parser = Parser()
parser.feed(sys.stdin.read())
page = find(parser.root, lambda node: node.has("welcome-page"))
if page is None:
    raise ValueError("The source did not contain the Connex homepage")
page = transform(page)
print('''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Connex — Version de développement</title>
<link rel="icon" href="./assets/favicon.svg"><link rel="stylesheet" href="./style.css">
<script src="./script.js" defer></script></head><body>''')
print(render(page))
print('''<dialog class="preview-notice" aria-labelledby="preview-title" aria-describedby="preview-description">
<span class="preview-label">APERÇU PRIVÉ</span><h2 id="preview-title">Version en développement</h2>
<p id="preview-description">Cette version est destinée à la présentation et aux tests. Merci de ne pas la publier ni la mettre en ligne.</p>
<button type="button" class="preview-accept" autofocus>J’ai compris, voir l’aperçu</button></dialog>
<noscript><aside class="preview-noscript">Version en développement — Ne pas publier ni mettre en ligne. Activez JavaScript pour voir les animations et changer de parcours.</aside></noscript>
</body></html>''')
