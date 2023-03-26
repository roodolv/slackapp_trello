// 配列操作用map()メソッドを含むライブラリUnderscore読み込み
var _ = Underscore.load();

// 各種スクリプトプロパティ(環境変数)の設定
var scriptProp = PropertiesService.getScriptProperties().getProperties();

var TRELLO_ENDPOINT = scriptProp.TRELLO_ENDPOINT;
var TRELLO_API_KEY = scriptProp.TRELLO_API_KEY;
var TRELLO_API_TOKEN = scriptProp.TRELLO_API_TOKEN;

// リストとカード保存用のグローバル配列宣言(Slack JSON Blocksの整形に利用)
// trelloCardList.lengthはボード内のリスト数, trelloCardList[i].lengthはリスト内のカード数をそれぞれ表す
var trelloList = [];
var trelloCardList = [];

////////////////////////////////////////////////////////////////////////
//                Slash Commandを受け取り動作するメイン部分                //
////////////////////////////////////////////////////////////////////////
function doPost(e){
  // SlackのVerification Token確認
  var verificationToken = e.parameter.token;
  if (verificationToken !== scriptProp.SLACK_VERIFICATION){
    throw new Error('Invalid Token');
  }

  // 各種変数宣言
  var slackWebhookUrl = scriptProp.SLACK_WEBHOOK;
  var message = "";
  var blockJSON = "";
  var jsonData = {};

  // 同ペイロードのtextからRegexでコマンドを検索しif-elseで分岐処理
  var command = e.parameter.text;
  // コマンドがnullの場合
  if (!command){
    message = "/ultraの直後に半角スペースを入れ、各種コマンドを指定してください";
    jsonData = { "text" : message };

  // コマンドが"list"の場合
  } else if (/list/i.test(command)){
    // かつコマンドに半角スペースが含まれない場合
    if (!command.match(" ")){
    message = "/ultra listの直後に半角スペースを入れ、Trelloボード名を正確に指定してください\n" +
              " (e.g.) `/ultra list [ボード名]`";
    jsonData = { "text" : message };
    } else {
    // listコマンドの後に半角スペースが入力された場合,リスト表示する対象ボードをコマンド引数から特定
    var trelloBoardId = identifyBoard(command);
    if (trelloBoardId === "nothing") {
      message = "指定されたTrelloのボード名が間違っています。ボード名を正確に指定してください\n" +
            " (e.g.) `/ultra list [ボード名]`";
      jsonData = { "text" : message };
    }
    getCardList(trelloBoardId);
    blockJSON = composeBlocks();
    jsonData = { "blocks" : blockJSON };
    }

  // コマンドが不適切な場合
  } else {
    message = "コマンドを正確に指定してください(大文字可)\n" +
              " (e.g.) `/ultra list [ボード名]`";
    jsonData = { "text" : message };
  }

  // ペイロードをSlackのチャンネルへPOST
  postSlack(jsonData, slackWebhookUrl);
  // エラーメッセージ回避のため無をreturn
  return ContentService.createTextOutput("");
}

////////////////////////////////////////////////////////////////////////
//                            メイン部分ここまで                         //
////////////////////////////////////////////////////////////////////////

function identifyBoard(command){
  // doPost(e)から受け取ったcommandの中身でリスト化するTrelloボードを場合分け
  switch(true){
    case /home/i.test(command):
      trelloBoardId = scriptProp.BOARD_ID_HOME;
      break;
    case /dev/i.test(command):
      trelloBoardId = scriptProp.BOARD_ID_DEV;
      break;
    // 上記のいずれでもない場合
    default:
      trelloBoardId = "nothing";
      break;
  }
  return trelloBoardId;
}

function getCardList(trelloBoardId) {
  var res = [];
  // ボードIDから各ボード内のリスト一覧を取得
  trelloList = JSON.parse(fetchTrello("list", "boards/" + trelloBoardId + "/lists").bodyText);
  // ボード内リストの数だけループを周回
  for (var i = 0; i < trelloList.length; i++) {
    // 各リスト内のカード一覧を取得, Underscoreのmapで入れ子配列にする
    res = JSON.parse(fetchTrello("card", "lists/" + trelloList[i].id + "/cards").bodyText);
    trelloCardList.push({name: trelloList[i].name,
                         length: res.length,
                         cardName: _.map(res, function(item) {return item.name}),
                         cardUrl: _.map(res, function(item) {return item.shortUrl}),
                         cardDue: _.map(res, function(item) {return item.due}),
                         cardLabel: _.map(res, function(item) {return item.labels})})
  }
}

function fetchTrello(target, path) {
  // カード取得時だけnameとid以外に種々の情報を取得する
  var url = "";
  if (target==="card"){
    url = TRELLO_ENDPOINT
          + path
          + "?key=" + TRELLO_API_KEY
          + "&token=" + TRELLO_API_TOKEN
          + "&fields=name,shortUrl,dueComplete,due,labels";
  } else {
    url = TRELLO_ENDPOINT
          + path
          + "?key=" + TRELLO_API_KEY
          + "&token=" + TRELLO_API_TOKEN
          + "&fields=name"; // nameとidのみ取得
  }
  var urlFetchOption = {
    "method" : "get",
    "contentType" : "application/json; charset=utf-8",
    "muteHttpExceptions" : true
  };

  var response = UrlFetchApp.fetch(url, urlFetchOption);
  try {
    return {
      responseCode : response.getResponseCode(),
      rateLimit : {
        limit : response.getHeaders()["X-RateLimit-Limit"],
        remaining : response.getHeaders()["X-RateLimit-Remaining"],
      },
      parseError : false,
      body : JSON.parse(response.getContentText()),
      bodyText : response.getContentText()
    };
  } catch(e) {
    return {
      responseCode : response.getResponseCode(),
      rateLimit : {
        limit : response.getHeaders()["X-RateLimit-Limit"],
        remaining : response.getHeaders()["X-RateLimit-Remaining"],
      },
      parseError : true,
      body : null,
      bodyText : response.getContentText()
    };
  }
}

function composeBlocks(){
  var blockJSON = "[";
  // リスト毎にblockを作成
  for (var i = 0; i < trelloCardList.length; i++){
    // "Finished"リストの場合のみ処理スキップ
    if (trelloCardList[i].name === "Finished") { continue; }

    // リスト名context作成
    blockJSON += "{'type': 'context'," +
                 "'elements':[" +
                 "{'type': 'image', 'image_url':" +
                 "'https://slack-chat.trello.services/img/card-gray-900.png', "i +
                 "'alt_text': 'Card List'}," +
                 "{'type': 'mrkdwn', 'text':" +
                 "'*" + trelloCardList[i].name + " " +
                 "(" + trelloCardList[i].length + ")*'}]}";

    // カード枚数ゼロでない時は各カードのcontextを作成
    if (trelloCardList[i].cardName.length > 0) {
      for (var k = 0; k < trelloCardList[i].length; k++){
        // 最初のカードcontext前にだけカンマ
        if (k === 0) { blockJSON += ","; }
        blockJSON +=  "{'type': 'context'," +
                      "'elements':[" +
                      "{'type': 'mrkdwn', 'text':" +
                      "'*<" + trelloCardList[i].cardUrl[k] + "|" + trelloCardList[i].cardName[k] + ">*'}]},";
        // 各カードのdueの有無を調べ,画像付きcontextを作成
        if (!trelloCardList[i].cardDue[k]) {
          blockJSON += "{'type': 'context'," +
                       "'elements':[" +
                       "{'type': 'image', 'image_url':" +
                       "'" + scriptProp.IMG_CLOCK + "', " +
                       "'alt_text': 'Due'}," +
                       "{'type': 'mrkdwn', 'text':" +
                       "'---'}";
        } else {
          blockJSON += "{'type': 'context'," +
                       "'elements':[" +
                       "{'type': 'image', 'image_url':" +
                       "'" + scriptProp.IMG_CLOCK + "', " +
                       "'alt_text': 'Due'}," +
                       "{'type': 'mrkdwn', 'text':" +
                       "'" + trelloCardList[i].cardDue[k].substr(0,10) + "'}";
        }
        // 各カードのlabelsの有無を調べ,画像付きcontextをlabelの数だけ作成
        blockJSON += ",";
        if (trelloCardList[i].cardLabel[k].length === 0) {
          blockJSON += "{'type': 'image', 'image_url':" +
                       "'" + scriptProp.IMG_LABEL + "', " +
                       "'alt_text': 'Label'}," +
                       "{'type': 'mrkdwn', 'text':" +
                       "'---'}]}";
        } else {
          blockJSON += "{'type': 'image', 'image_url':" +
                       "'" + scriptProp.IMG_LABEL + "', " +
                       "'alt_text': 'Label'},";
          for (var l = 0; l < trelloCardList[i].cardLabel[k].length; l++){
            blockJSON += "{'type': 'mrkdwn', 'text':" +
                         "'" + trelloCardList[i].cardLabel[k][l].name + "'}";
            // 最後のラベル以外はblock(image,mrkdwn)末尾にカンマ
            if (l !== (trelloCardList[i].cardLabel[k].length - 1)) {
              blockJSON += ",";
            }
          }
          // Dueから始まったcontextを閉じる
          blockJSON += "]}";
        }
        // 最後のカード以外は末尾にカンマ
        if (k !== (trelloCardList[i].length - 1)) {
          blockJSON += ",";
        }
      }
    }

    // 次に表示するリストが無い場合(Finishedも表示しないのでFinishedの1つ手前の場合も)を除いて末尾にdividerを入れる
    if (i !== (trelloCardList.length - 1) && trelloCardList[i+1].name !== "Finished") {
      blockJSON += ",{'type': 'divider'},";
    }
  }
  // 一番最初の括弧を閉じる
  blockJSON += "]";

  return blockJSON;
}

function postSlack(jsonData, slackWebhookUrl){
  var url = slackWebhookUrl;
  var payload = JSON.stringify(jsonData);
  var options = {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : payload
  };

  UrlFetchApp.fetch(url, options);
}
