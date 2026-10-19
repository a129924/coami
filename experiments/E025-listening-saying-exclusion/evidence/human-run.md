# E025 真人判定

- 實際保存時間：2026-10-19T06:00:44.899Z
- Tester：Andrew
- Browser：Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36
- 設備／音量：耳機 40 %
- Session：86e6df4c-445b-4f58-8a8e-a82b89a1c56b

真人欄位是操作者自行填寫，程式 interval 與真人聽辨分開；不包含原始音訊。

```json
[
  {
    "id": "56a91495-ee02-485d-b746-c82eb54ea5f5",
    "recordBytes": 78542,
    "mode": "baseline-record",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "單項基線完成；等待真人確認",
      "status": "baseline-complete",
      "overlapMs": 0
    }
  },
  {
    "id": "01aef9e1-a13d-45e8-9952-93832d333906",
    "recordBytes": 0,
    "mode": "baseline-say",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "單項基線完成；等待真人確認",
      "status": "baseline-complete",
      "overlapMs": 0
    }
  },
  {
    "id": "782aabf6-6c21-44e5-b2c6-63fe043d022a",
    "recordBytes": 79508,
    "mode": "baseline-record",
    "tts": "heard",
    "recording": "heard",
    "note": "",
    "result": {
      "reason": "單項基線完成；等待真人確認",
      "status": "baseline-complete",
      "overlapMs": 0
    }
  },
  {
    "id": "849ebfbb-3145-48ff-919e-24c2d86466c1",
    "recordBytes": 0,
    "mode": "baseline-say",
    "tts": "heard",
    "recording": "not-applicable",
    "note": "",
    "result": {
      "reason": "單項基線完成；等待真人確認",
      "status": "baseline-complete",
      "overlapMs": 0
    }
  },
  {
    "id": "15743b5a-4e3b-4d31-b6ff-c7467944aa90",
    "recordBytes": 79508,
    "mode": "record-say",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3689.199999809265
    }
  },
  {
    "id": "73ef11be-1998-4c9a-86a2-6ec839d41b43",
    "recordBytes": 75644,
    "mode": "say-record",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3116.5
    }
  },
  {
    "id": "f3909bde-bfae-48fb-af62-015490d1fa0d",
    "recordBytes": 79508,
    "mode": "record-say",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3470.5
    }
  },
  {
    "id": "2f200ea8-e951-4611-9726-a56957d46593",
    "recordBytes": 76610,
    "mode": "say-record",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3060.5999999046326
    }
  },
  {
    "id": "85b5916b-1ab0-425b-86ad-09aef86048bc",
    "recordBytes": 77576,
    "mode": "record-say",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3344.2000002861023
    }
  },
  {
    "id": "27f4e5d2-f548-4a5b-a1fc-d1567d33b2de",
    "recordBytes": 77576,
    "mode": "say-record",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3055.300000190735
    }
  },
  {
    "id": "8375d456-d020-4003-b26f-7abea96da30c",
    "recordBytes": 76610,
    "mode": "record-say",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3341.5
    }
  },
  {
    "id": "65e25cd7-7aa9-47ed-ab14-e4d90f3ddfbe",
    "recordBytes": 76610,
    "mode": "say-record",
    "tts": "unconfirmed",
    "recording": "unconfirmed",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3065.7999997138977
    }
  },
  {
    "id": "88ae9c37-415d-44f4-99bb-77e15bfbf6a1",
    "recordBytes": 77576,
    "mode": "record-say",
    "tts": "heard",
    "recording": "heard",
    "note": "",
    "result": {
      "reason": "Capture and completed TTS playback intervals overlap; human listening is separate",
      "status": "overlap-observed",
      "overlapMs": 3352.5
    }
  }
]
```
