// ==UserScript==
// @name         JBU 뉴스 자동채우기 (카피라이트 범용 최종본)
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  뉴스 링크 입력 → 제목 / 앞 3문단 / 카피라이트(저작권자~금지 / copyright~All rights reserved) / 원문보기 자동 입력
// @match        https://www.joongbu.ac.kr/board.es*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // 🟢 글쓰기 페이지에서만 실행
    if (!document.querySelector("#title") || !document.querySelector("#content_textarea")) {
        return;
    }

    alert("✅ JBU 자동 뉴스 입력 스크립트 실행됨!");

    // 뉴스 URL 입력
    const newsUrl = prompt("뉴스 기사 링크를 입력하세요:");
    if (!newsUrl) {
        alert("뉴스 주소를 입력하지 않아 자동 채우기를 취소했습니다.");
        return;
    }

    // 🔥 Tampermonkey 전용 요청 (CORS 무시 가능)
    GM_xmlhttpRequest({
        method: "GET",
        url: newsUrl,
        onload: function(response) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // 1) 제목 추출
            let title = doc.querySelector("meta[property='og:title']")?.content
                     || doc.querySelector("title")?.innerText
                     || "제목 없음";

            // 2) 본문 앞 3문단 추출 (범용 selector)
            const article =
                doc.querySelector("#articleWrap") ||           // 연합뉴스
                doc.querySelector(".article-view-content") ||  // 헬로티
                doc.querySelector(".news_end") ||              // 네이버 뉴스
                doc.querySelector(".news_content") ||          // 매일경제
                doc.querySelector(".art_text") ||              // 조선일보
                doc.querySelector("article") || 
                doc.body;

            let extractedParagraphs = [];
            const paragraphs = article.querySelectorAll("p");

            for (let p of paragraphs) {
                const text = p.innerText.trim();
                if (
                    text.length > 30 &&
                    !text.includes("사진") &&
                    !text.includes("기자") &&
                    !text.includes("무단 전재") &&
                    !text.includes("All rights reserved") &&
                    !text.includes("저작권") // 본문 안에 섞인 저작권 문구 제외
                ) {
                    extractedParagraphs.push(text);
                }
                if (extractedParagraphs.length >= 3) break; // 앞 3문단까지만
            }

            let bodyText = extractedParagraphs.join("\n\n");

            // 3) 카피라이트 추출 (범용 잘라내기)
            function extractCopyright(rawText) {
                if (!rawText) return null;
                rawText = rawText.replace(/&lt;/g, "")
                                 .replace(/&gt;/g, "")
                                 .replace(/[<>]/g, "")
                                 .trim();
                // 저작권자~금지 / copyright~All rights reserved
                let match = rawText.match(/(저작권자.*?(금지|All rights reserved))/i)
                         || rawText.match(/(copyright.*?(금지|All rights reserved))/i)
                         || rawText.match(/(ⓒ.*?(금지|All rights reserved))/i);
                return match ? match[1].trim() : null;
            }

            let rawCopy =
                doc.querySelector("p.txt-copyright")?.innerText
             || doc.querySelector("[class*='copyright']")?.innerText
             || doc.querySelector(".copy")?.innerText
             || doc.querySelector("footer")?.innerText
             || "";

            let copyrightText = extractCopyright(rawCopy);

            // fallback: 전체 노드에서 검색
            if (!copyrightText || copyrightText.includes("URL 복사")) {
                const allNodes = Array.from(doc.querySelectorAll("p, div, span, em"))
                    .map(el => el.textContent.trim());
                for (let i = allNodes.length - 1; i >= 0; i--) {
                    let found = extractCopyright(allNodes[i]);
                    if (found) {
                        copyrightText = found;
                        break;
                    }
                }
            }

            // 최종 기본값
            if (!copyrightText) {
                copyrightText = "Copyright ⓒ 원문 언론사. All rights reserved.";
            }

            // 4) 최종 본문 구성
            const content = `${bodyText}\n\n${copyrightText}\n\n원문보기 : ${newsUrl}`;

            // 5) 입력창 자동 채우기
            document.querySelector("#title").value = title;
            document.querySelector("#m_name").value = "인공지능"; // 작성자 고정
            document.querySelector("#content_textarea").value = content;

            alert("✅ 뉴스 자동 입력 완료!");
        },
        onerror: function(err) {
            console.error("뉴스 불러오기 실패:", err);
            alert("❌ 뉴스를 불러오는 데 실패했습니다.");
        }
    });

})();
