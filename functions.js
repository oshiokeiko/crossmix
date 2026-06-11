// ============================================================
// Crossmix の動きをまとめたファイル
// 関数はすべてこのファイルに書く
// ※このファイルは「モジュール版」で読み込む（index.html 参照）
// ============================================================


// ============================================================
// Firebase（Firestore）の道具を読み込む
// ・collection      … どの箱（コレクション）に入れるかを指定する道具
// ・addDoc          … データを1件追加する道具
// ・serverTimestamp … サーバーの時刻を自動で記録する道具（並び順用）
// ・onSnapshot      … 箱の中身を常に見張り、変化があれば自動で知らせる道具（リアルタイム表示用）
// ※ window.db（保存場所）は index.html の中で用意する
// ============================================================
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


// ============================================================
// 設定エリア
// ============================================================

// タグの初期セット（ここを書き換えればタグを変えられる）
// この配列を元に、フォームのタグボタンや一覧のセクションを作る
const TAGS = [
  "話しかけて〜",
  "お酒飲んじゃってます",
  "ガチ学び中",
  "迷子です",
  "名刺交換したい"
];

// 1セクションに最初から表示するカードの数
// これを超えたら、末尾に「すべて表示」カードを出す（ここの数字を変えれば調整できる）
const CARDS_PER_SECTION = 5;

// いま選ばれているタグを覚えておく入れ物
// 初期値は一番最初のタグ（必ず1つ選ばれている状態にする）
let selectedTag = TAGS[0];

// 選んだ写真（縮小後の文字データ）を覚えておく入れ物（最初は無し）
let selectedPhotoData = "";

// 「すべて表示」が押されたタグを覚えておく（そのタグは全部表示する）
const expandedTags = {};

// 最新のプロフィール一覧（「すべて表示」を押したときの描き直しに使う）
let latestProfiles = [];


// ============================================================
// 画面の切り替え（一覧 ⇄ フォーム）
// ============================================================

// フォーム画面を開く関数（一覧を隠してフォームを表示する）
function openForm() {
  $("#list-screen").addClass("hidden");   // 一覧を隠す
  $("#form-screen").removeClass("hidden"); // フォームを表示
  window.scrollTo(0, 0);                   // 画面の一番上に戻す
}

// フォーム画面を閉じる関数（フォームを隠して一覧に戻る）
function closeForm() {
  $("#form-screen").addClass("hidden");    // フォームを隠す
  $("#list-screen").removeClass("hidden"); // 一覧を表示
  window.scrollTo(0, 0);
}


// ============================================================
// タグボタンを並べる関数
// 設定エリアの TAGS をもとに、フォームのタグボタンを自動で作る
// ============================================================
function renderTags() {
  const $tagList = $("#tag-list");
  $tagList.empty(); // 念のため、中身を一度空にする

  // TAGS の1つ1つについて、ボタンを作って並べる
  TAGS.forEach(function (tag, index) {
    // ボタンを作る
    const $chip = $('<button type="button" class="tag-chip"></button>');
    $chip.text(tag);

    // 一番最初のタグは、初めから選ばれている状態にする
    if (index === 0) {
      $chip.addClass("selected");
      selectedTag = tag;
    }

    // ボタンが押されたときの動き
    $chip.on("click", function () {
      $(".tag-chip").removeClass("selected"); // 全部の選択を一旦外す
      $chip.addClass("selected");             // 押したものだけ選択状態に
      selectedTag = tag;                      // 選んだタグを覚える
    });

    // フォームに追加する
    $tagList.append($chip);
  });
}


// ============================================================
// プロフィールを保存する関数
// 「登録する」ボタンが押されたときに実行される
// ============================================================
function saveProfile(event) {
  event.preventDefault(); // 送信でページが再読み込みされるのを防ぐ

  // 名前を取り出す（前後の空白は取り除く）
  const name = $("#name-input").val().trim();

  // 名前は必須。空ならエラーを出してここで止める
  if (name === "") {
    alert("名前を入れてください（名前は必須です）");
    return;
  }

  // 入力内容を1つのオブジェクト（1人分のデータ）にまとめる
  const profile = {
    name: name,
    affiliation: $("#affiliation-input").val().trim(), // 所属
    comment: $("#comment-input").val().trim(),         // 一言
    tag: selectedTag,                                  // 選んだタグ（未選択なら空）
    photoUrl: selectedPhotoData,                       // 写真（縮小後の文字データ。無ければ空）
    sns: {
      twitter: $("#twitter-input").val().trim(),
      instagram: $("#instagram-input").val().trim(),
      linkedin: $("#linkedin-input").val().trim(),
      facebook: $("#facebook-input").val().trim()
    },
    url: $("#url-input").val().trim(),                 // HPリンク
    createdAt: serverTimestamp()                       // 登録時刻（並び順用）
  };

  // Firestore の profiles に1件追加する
  addDoc(collection(window.db, "profiles"), profile)
    .then(function () {
      alert("登録しました！");
      $("#profile-form")[0].reset();  // フォームの入力を空に戻す
      renderTags();                   // タグを初期状態（先頭が選択済み）に戻す
      resetPhoto();                   // 写真プレビューと選択もリセット
      closeForm();                    // 一覧画面に戻る
    })
    .catch(function (error) {
      alert("保存に失敗しました: " + error.message);
    });
}


// ============================================================
// 写真の処理
// ============================================================

// 写真を要素に当てはめる関数
// 写真があれば本物を背景に表示、なければシルエット（placeholder）にする
function applyPhoto($el, photoUrl) {
  if (photoUrl) {
    $el.css({
      "background-image": "url(" + photoUrl + ")",
      "background-size": "cover",
      "background-position": "center"
    });
  } else {
    $el.addClass("placeholder-photo");
  }
}

// 写真が選ばれたときの処理
// 画像を長辺320pxに縮小し、軽い文字データ(JPEG)に変換して覚えておく
function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return; // 選ばれなかったら何もしない
  }

  // ファイルを読み込む
  const reader = new FileReader();
  reader.onload = function (e) {
    // 読み込んだデータを画像として扱う
    const img = new Image();
    img.onload = function () {
      // 長辺が320pxになるよう、縮小後のサイズを計算する
      const maxSize = 320;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSize) {
        height = height * (maxSize / width);
        width = maxSize;
      } else if (height >= width && height > maxSize) {
        width = width * (maxSize / height);
        height = maxSize;
      }

      // canvas（お絵かき用の板）に縮小して描く
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      // 軽いJPEGの文字データに変換して覚えておく（品質0.7で軽くする）
      selectedPhotoData = canvas.toDataURL("image/jpeg", 0.7);

      // 丸い枠にプレビュー表示する
      applyPhoto($(".photo-circle"), selectedPhotoData);
      $(".photo-circle").addClass("has-photo");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 写真の選択とプレビューをリセットする関数
function resetPhoto() {
  selectedPhotoData = "";
  $(".photo-circle")
    .css("background-image", "")
    .removeClass("has-photo");
}


// ============================================================
// カード1枚を作る関数
// プロフィール1人分のデータを受け取り、カードの見た目を組み立てて返す
// （.text() で入れることで、入力された文字をそのまま安全に表示する）
// ============================================================
function createCard(profile) {
  const $card = $('<article class="card"></article>');

  // 写真（あれば本物・なければシルエット）
  const $photo = $('<div class="card-photo"></div>');
  applyPhoto($photo, profile.photoUrl);
  $card.append($photo);

  // 名前・所属・一言
  const $body = $('<div class="card-body"></div>');
  $('<p class="card-name"></p>').text(profile.name).appendTo($body);

  // 所属・一言は、入力があるときだけ表示する
  if (profile.affiliation) {
    $('<p class="card-affiliation"></p>').text(profile.affiliation).appendTo($body);
  }
  if (profile.comment) {
    $('<p class="card-comment"></p>').text(profile.comment).appendTo($body);
  }

  $card.append($body);

  // カードをタップしたら、詳細モーダルを開く
  $card.on("click", function () {
    openDetail(profile);
  });

  return $card;
}


// ============================================================
// 一覧を作り直す関数
// プロフィールの配列を受け取り、セクションごと作り直す
// ※「その人がいるタグ」のセクションだけ作る（誰もいないタグは表示しない）
// ============================================================
function renderList(profiles) {
  const $sections = $("#sections");
  $sections.empty(); // いったん全部消して作り直す

  // TAGS の順番でセクションを作る。ただし、そのタグを選んだ人がいる場合だけ。
  TAGS.forEach(function (tag) {
    // このタグを選んだ人だけ抜き出す（.filter で絞り込み）
    const cardsForTag = profiles.filter(function (profile) {
      return profile.tag === tag;
    });

    // 1人もいなければ、このタグのセクションは作らない
    if (cardsForTag.length === 0) {
      return;
    }

    // セクションの枠とタイトル
    const $section = $('<section class="tag-section"></section>');
    $('<h2 class="section-title"></h2>').text(tag).appendTo($section);

    // カードを入れる行
    const $row = $('<div class="card-row"></div>');

    // このタグが「すべて表示」済みかどうか
    const isExpanded = expandedTags[tag];

    // 多すぎる＆まだ展開していないときは、最初の数枚だけ見せる
    let cardsToShow = cardsForTag;
    if (!isExpanded && cardsForTag.length > CARDS_PER_SECTION) {
      cardsToShow = cardsForTag.slice(0, CARDS_PER_SECTION);
    }

    // カードを並べる
    cardsToShow.forEach(function (profile) {
      $row.append(createCard(profile));
    });

    // 隠れているカードがあれば、末尾に「すべて表示」カードを足す
    if (!isExpanded && cardsForTag.length > CARDS_PER_SECTION) {
      const $more = $('<button type="button" class="card more-card"></button>');
      $more.text("すべて表示");
      $more.on("click", function () {
        expandedTags[tag] = true;     // このタグを「全部見せる」状態にする
        renderList(latestProfiles);   // 画面を作り直す
      });
      $row.append($more);
    }

    $section.append($row);
    $sections.append($section);
  });
}


// ============================================================
// Firestore を見張ってリアルタイム表示する関数
// profiles の箱に変化があるたびに、自動で画面を作り直す
// ============================================================
function listenProfiles() {
  const profilesRef = collection(window.db, "profiles");

  // onSnapshot：箱の中身が変わるたびに、中の関数が自動で呼ばれる
  onSnapshot(profilesRef, function (snapshot) {

    // すべてのプロフィールを配列に集める
    const profiles = [];
    snapshot.forEach(function (doc) {
      // serverTimestamps:"estimate" で、登録直後でも時刻が入った状態で受け取れる
      profiles.push(doc.data({ serverTimestamps: "estimate" }));
    });

    // 新着順（createdAt が新しい順）に並べ替える
    profiles.sort(function (a, b) {
      const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
      return timeB - timeA; // 数が大きい（新しい）方を先に
    });

    // 最新の一覧を覚えておく（「すべて表示」を押したときの描き直しに使う）
    latestProfiles = profiles;

    // 並べ替えたカードを画面に表示する（人がいるタグだけセクションを作る）
    renderList(profiles);
  });
}


// ============================================================
// リンクを1つ追加する小さな関数
// URL が入っているときだけ、リンクボタンを作って入れ物に足す
// ============================================================
function addLink($container, url, label) {
  if (!url) {
    return; // 空のときは何もしない
  }
  const $link = $('<a class="detail-link" target="_blank" rel="noopener"></a>');
  $link.attr("href", url);
  $link.text(label);
  $container.append($link);
}


// ============================================================
// 詳細モーダルを開く関数
// プロフィール1人分のデータを受け取り、モーダルの中身を作って表示する
// ============================================================
function openDetail(profile) {
  const $content = $("#detail-modal .modal-content");
  $content.empty(); // 前回の中身を消す

  // 閉じるボタン（×）
  const $close = $('<button type="button" class="modal-close" aria-label="閉じる">×</button>');
  $close.on("click", closeDetail);
  $content.append($close);

  // 写真（大きめ・あれば本物・なければシルエット）
  const $photo = $('<div class="detail-photo"></div>');
  applyPhoto($photo, profile.photoUrl);
  $content.append($photo);

  // 名前
  $('<p class="detail-name"></p>').text(profile.name).appendTo($content);

  // 所属（あれば）
  if (profile.affiliation) {
    $('<p class="detail-affiliation"></p>').text(profile.affiliation).appendTo($content);
  }

  // 一言（あれば・省略せずフル表示）
  if (profile.comment) {
    $('<p class="detail-comment"></p>').text(profile.comment).appendTo($content);
  }

  // SNS・HPリンク（入力があるものだけ表示する）
  const $links = $('<div class="detail-links"></div>');
  const sns = profile.sns || {}; // sns が無いデータでもエラーにならないように
  addLink($links, sns.twitter, "Twitter / X");
  addLink($links, sns.instagram, "Instagram");
  addLink($links, sns.linkedin, "LinkedIn");
  addLink($links, sns.facebook, "Facebook");
  addLink($links, profile.url, "ホームページ");
  $content.append($links);

  // モーダルを表示する
  $("#detail-modal").removeClass("hidden");
}


// ============================================================
// 詳細モーダルを閉じる関数
// ============================================================
function closeDetail() {
  $("#detail-modal").addClass("hidden");
}


// ============================================================
// 起動時の処理
// ページが読み込まれたら、ボタンに「押されたときの動き」を結びつける
// ※ $(function(){ ... }) は「ページの準備ができたら中身を実行」する jQuery の書き方
// ============================================================
$(function () {

  // 右上の「登録する」ボタンを押したらフォームを開く
  $("#open-form-btn").on("click", openForm);

  // フォームの「←」戻るボタンを押したら一覧に戻る
  $("#close-form-btn").on("click", closeForm);

  // タグボタンを並べる（フォーム用）
  renderTags();

  // フォームが送信（登録ボタン）されたら保存する
  $("#profile-form").on("submit", saveProfile);

  // 写真が選ばれたら、縮小して覚えておく
  $("#photo-input").on("change", handlePhotoSelect);

  // 一覧画面：Firestore を見張って、カードをリアルタイムで表示する
  // （タグ別セクションも、その都度この中で作り直す）
  listenProfiles();

  // 詳細モーダル：背景（暗い部分）をタップしたら閉じる
  $("#detail-modal .modal-backdrop").on("click", closeDetail);

});
