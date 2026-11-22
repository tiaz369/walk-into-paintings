#!/usr/bin/env python3
# 走进名画 · verify_artwork.py 的自动测试
# 运行：python3 -m unittest discover -s tools/tests -v
#
# 每个测试把仓库里一个真实场景（painter-of-sunflowers）复制到临时文件夹，再故意弄坏一处，
# 看检查脚本能不能抓到。第一个测试是“好的样本”：一处都不改，应该没有 FAIL。
# 只用 Python 自带的库，不改仓库里的任何文件。
import io, json, os, shutil, sys, tempfile, unittest
from contextlib import redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import verify_artwork as V   # noqa: E402

SID = 'painter-of-sunflowers'
TODAY = V.datetime.date(2026, 11, 22)


class Fixture:
    """临时的小仓库：登记表、check_scenes.py 要用的文件、一个场景。new=True 时把它当成新画（严格规则）。"""

    def __init__(self, new=True):
        self.root = tempfile.mkdtemp(prefix='wip-verify-')
        for rel in ('data', 'scenes/' + SID):
            shutil.copytree(os.path.join(REPO, rel), os.path.join(self.root, rel))
        os.makedirs(os.path.join(self.root, 'assets'))
        os.makedirs(os.path.join(self.root, 'tools'))
        shutil.copy(os.path.join(REPO, 'assets/sound.js'), os.path.join(self.root, 'assets'))
        shutil.copy(os.path.join(REPO, 'tools/check_scenes.py'), os.path.join(self.root, 'tools'))
        self.edit_meta(lambda m: m.update(added='2026-11-22' if new else '2026-11-01'))

    # 改登记表里这一幅画的那一行
    def edit_meta(self, fn):
        p = os.path.join(self.root, 'data/scenes.json')
        R = json.load(open(p, encoding='utf-8'))
        fn(next(s for s in R['scenes'] if s['id'] == SID))
        json.dump(R, open(p, 'w', encoding='utf-8'), ensure_ascii=False)

    # 改 scene.json
    def edit_scene(self, fn):
        p = os.path.join(self.root, 'scenes', SID, 'scene.json')
        S = json.load(open(p, encoding='utf-8'))
        fn(S)
        json.dump(S, open(p, 'w', encoding='utf-8'), ensure_ascii=False)

    def image(self, name, kb):
        with open(os.path.join(self.root, 'scenes', SID, 'images', name), 'wb') as f:
            f.write(b'\xff\xd8' + os.urandom(kb * 1024))

    def run(self):
        rep = V.Report(SID)
        V.check_static(SID, self.root, rep, TODAY)
        return rep

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)


def rows(rep, result, rule):
    return [r for r in rep.rows if r['result'] == result and r['rule'] == rule]


class GoodSample(unittest.TestCase):
    def test_real_scene_has_no_fail(self):
        fx = Fixture(new=True)
        try:
            rep = fx.run()
            self.assertEqual(rep.failed(), [], rep.text())
            for rule in ('L1', 'C1', 'P1', 'X2', 'M4', 'A1'):
                self.assertTrue(rows(rep, 'PASS', rule), f'{rule} 应该通过\n' + rep.text())
            self.assertTrue(rows(rep, 'HUMAN', 'A1'), '事实核对一定要留给人')
        finally:
            fx.cleanup()


class BrokenSamples(unittest.TestCase):
    def setUp(self): self.fx = Fixture(new=True)
    def tearDown(self): self.fx.cleanup()

    def test_missing_english(self):
        self.fx.edit_scene(lambda S: S['cards']['december']['text'].update(en=''))
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'L1'))

    def test_forbidden_image_site(self):
        def bad(S):
            S['imageSource']['files'][0]['url'] = 'https://www.vangoghmuseum.nl/en/collection/s0225V1962.jpg'
        self.fx.edit_scene(bad)
        rep = self.fx.run()
        self.assertTrue(rows(rep, 'FAIL', 'C3'), rep.text())
        self.assertTrue(rows(rep, 'FAIL', 'C1'), '不在允许名单里的网站也要报 C1')

    def test_image_without_source_record(self):
        self.fx.image('extra.jpg', 10)
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'C2'))

    def test_image_status_not_ok(self):
        self.fx.edit_scene(lambda S: S['imageSource']['files'][0].update(status='待核对'))
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'C1'))

    def test_big_image_fails_for_new_scene(self):
        self.fx.edit_scene(lambda S: S['imageSource']['files'].append(dict(S['imageSource']['files'][0], file='big.jpg')))
        self.fx.image('big.jpg', 600)
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'P1'))

    def test_seven_cards_fail_for_new_scene(self):
        self.fx.edit_scene(lambda S: S['cards'].update(extra=S['cards']['december']))
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'I2'))

    def test_room_without_verified_date(self):
        self.fx.edit_meta(lambda m: (m.update(room='Gallery 1'), m.pop('roomVerified', None)))
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'A5'))

    def test_old_room_check_warns(self):
        self.fx.edit_meta(lambda m: m.update(room='Gallery 1', roomVerified='2026-07-01'))
        self.assertTrue(rows(self.fx.run(), 'WARN', 'A7'))

    def test_missing_registry_field(self):
        self.fx.edit_meta(lambda m: m.pop('artworkUrl'))
        self.assertTrue(rows(self.fx.run(), 'FAIL', '2.2'))

    def test_two_acts(self):
        self.fx.edit_scene(lambda S: S['ending']['acts'].pop())
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'I1'))

    def test_viewport_blocks_zoom(self):
        p = os.path.join(self.fx.root, 'scenes', SID, 'index.html')
        H = open(p, encoding='utf-8').read().replace('width=device-width', 'width=device-width, maximum-scale=1', 1)
        open(p, 'w', encoding='utf-8').write(H)
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'M4'))

    def test_unknown_cdn(self):
        p = os.path.join(self.fx.root, 'scenes', SID, 'index.html')
        H = open(p, encoding='utf-8').read().replace('</head>', '<script src="https://cdn.example.com/x.js"></script></head>', 1)
        open(p, 'w', encoding='utf-8').write(H)
        self.assertTrue(rows(self.fx.run(), 'FAIL', 'P2'))


class LegacyExceptions(unittest.TestCase):
    """老场景（2026-11-22 以前上线）：7 张卡片、超过 500KB 的图片只算 WARN。
    （check_scenes.py 自己的模板规则，比如肖像画 3–6 张卡片，照旧报 I1，不在这里测。）"""

    def test_legacy_warns_instead_of_fail(self):
        fx = Fixture(new=False)
        try:
            fx.edit_scene(lambda S: (S['cards'].update(extra=S['cards']['december']), S['spots'].update(extra={'x': 0.5, 'y': 0.5}),
                                     S['imageSource']['files'].append(dict(S['imageSource']['files'][0], file='big.jpg'))))
            fx.image('big.jpg', 600)
            rep = fx.run()
            self.assertFalse(rows(rep, 'FAIL', 'I2') or rows(rep, 'FAIL', 'P1'), rep.text())
            self.assertTrue(rows(rep, 'WARN', 'I2') and rows(rep, 'WARN', 'P1'))
        finally:
            fx.cleanup()


class CommandLine(unittest.TestCase):
    def test_exit_codes(self):
        fx = Fixture(new=True)
        try:
            with redirect_stdout(io.StringIO()):
                self.assertEqual(V.main([SID, '--root', fx.root, '--today', '2026-11-22']), 0)
                fx.edit_scene(lambda S: S['cards']['december']['text'].update(en=''))
                self.assertEqual(V.main([SID, '--root', fx.root, '--today', '2026-11-22']), 1)
                self.assertEqual(V.main([SID, '--root', fx.root, '--today', '2026-11-22', '--report-only']), 0)
        finally:
            fx.cleanup()


if __name__ == '__main__':
    unittest.main()
