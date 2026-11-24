"""Gera public/selftest/spec.json para o teste no simulador (usa os mesmos títulos do teste Android)."""
import json, sys
lay = json.load(open(sys.argv[1]))
out = sys.argv[2]
P = '__TEST__'
def words(s, e, txt):
    ws = txt.split(); d = (e - s) / len(ws)
    return [{'w': w, 's': round(s + i * d, 2), 'e': round(s + (i + 1) * d - 0.04, 2)} for i, w in enumerate(ws)]
cap = {'fontFile': 'Montserrat-800.ttf', 'upper': False, 'size': 1, 'ls': 0, 'shadow': 'outline', 'hl': 'box', 'anim': 'pop', 'y': 0.73, 'color': '#FFFFFF', 'accent': '#F2D13A'}
A = {
    'segments': [
        {'path': P, 'startMs': 0, 'endMs': 3000, 'zoom': 1},
        {'path': P, 'startMs': 3500, 'endMs': 6000, 'zoom': 1.08},
        {'path': P, 'startMs': 6500, 'endMs': 9500, 'zoom': 1}],
    'boundaries': [3.0, 5.5], 'finalStart': 5.5, 'titleEnd': 2.6,
    'titleLayout': lay['vlog'], 'grade': dict(lay['grade'], fx=1, fxAmt=0.8),
    'transition': 'mix', 'transCodes': [1, 2],
    'captions': [{'s': 2.7, 'e': 4.2, 'words': words(2.7, 4.2, 'você sabia disso?')},
                 {'s': 5.5, 'e': 7.4, 'words': words(5.5, 7.4, 'então presta atenção')}],
    'captionStyle': cap, 'cta': 'Chama no WhatsApp', 'ending': 'fade', 'sfx': 'impact', 'quality': 'hd',
    'frames': [0.3, 1.2, 2.2, 2.95, 3.4, 5.5, 7.4, 8.2]}
B = {
    'segments': [
        {'path': P, 'startMs': 1000, 'endMs': 3400, 'speed': 2.0, 'removeAudio': True},
        {'path': P, 'startMs': 5000, 'endMs': 5600, 'speed': 0.5, 'removeAudio': True},
        {'path': P, 'startMs': 7000, 'endMs': 10000}],
    'boundaries': [1.2, 2.4], 'finalStart': -1, 'titleEnd': 2.4,
    'titleLayout': lay['entrevista'], 'grade': dict(lay['grade'], amount=0, bars=0, fx=3, fxAmt=0.9),
    'transition': 'glitch', 'transCodes': [3, 3],
    'captions': [{'s': 2.5, 'e': 4.5, 'words': words(2.5, 4.5, 'três erros que custam')}],
    'captionStyle': dict(cap, fontFile='Anton-400.ttf', upper=True, shadow='glow', hl='color', anim='bounce'),
    'cta': '', 'ending': 'cut', 'sfx': 'whoosh', 'quality': 'hd',
    'frames': [0.3, 0.9, 1.2, 1.6, 2.4, 3.6, 5.0]}
json.dump({'A': A, 'B': B}, open(out, 'w'))
print('spec ok')
