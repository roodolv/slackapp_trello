## スクリプトプロパティ一覧

```
{TRELLO_ENDPOINT}:https://api.trello.com/1/
{TRELLO_API_Key}:Trello APIのKey
{TRELLO_API_Token}:Trello APIのToken

以下TrelloのBoard ID(省略)
{BOARD_ID_HOME}:
{BOARD_ID_DEV}:

{SLACK_VERIFICATION}:省略(Slack AppのVerification Token)

{SLACK_WEBHOOK}:Incoming Webhook URL

以下Google Driveに入れた画像の表示用URL
{IMG_CLOCK}:
{IMG_LABEL}:
```

## Trello API

```
{User ID}: (トークンに合わせて勝手にTrello側で解釈してくれる)
{API Key}:
{API Token}:
{OAuth Secret Key}:<Trello APIのcurlでは不要なので省略>
```

## Trello URI

※`fields=name`はJSONペイロードの`name`キーの値だけ取るよう指示するフィルタ
※`name`のみのフィルタでも`id`は自動で追加取得する
※`name`以外に`shortUrl`, `due`, `labels`などがある

```
{URI(ボードID取得用)}:https://api.trello.com/1/members/me/boards?key=<APIキー>&token=<APIトークン>&fields=name
{URI(ボード内リスト取得用)}:https://api.trello.com/1/boards/<ボードID>/lists?key=<APIキー>&token=<APIトークン>&fields=name
{URI(リスト内カード取得用)}:https://api.trello.com/1/lists/<リストID>/cards?key=<APIキー>&token=<APIトークン>&fields=name,shortUrl,dueComplete,due,labels
{URI(カードPOST用)}:https://api.trello.com/1/cards?key=<APIキー>&token=<APIトークン>&idList=<投稿先リストID>&name=<カードタイトル>"
```

## Trello Board ID

```
{home}:
{dev}:
```

## Slack App Token

GAS側のSlack本人確認に使う
```
{Verification Token}:
```

## Slack Channel ID

```
{home(Trello DM)}:XXXXXXXXX
{dev}:XXXXXXXX
```

## Slack App Incoming Webhook

```
{home}:https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ
{dev}:https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ
```

## Google Drive Image Link

```
{Clock}:
{Label}:
```
