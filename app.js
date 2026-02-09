import { GoogleGenerativeAI } from "@google/generative-ai";

let TAROT_DB = [];
let PROMPT_TEMPLATE = "";
let currentSessionData = null;

async function loadTarotData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        TAROT_DB = data.TAROT_DB;
        PROMPT_TEMPLATE = data.PROMPT_TEMPLATE;
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

window.onload = async () => {
    await loadTarotData();
    loadConfig();
    renderHistory();
};

window.saveConfig = function() {
    const config = {
        username: document.getElementById("username").value,
        numCards: document.getElementById("numCards").value,
        apiKey: document.getElementById("apiKey").value,
        model: document.getElementById("modelSelect").value,
    };
    localStorage.setItem("aetheris_config", JSON.stringify(config));
    animateNotification("Đã lưu cấu hình!", "success");
    
    const button = event.target;
    button.classList.add('animate-gentle-shake');
    setTimeout(() => button.classList.remove('animate-gentle-shake'), 300);
};

window.clearConfig = function() {
    localStorage.removeItem("aetheris_config");
    document.getElementById("username").value = "";
    document.getElementById("numCards").value = "3";
    document.getElementById("apiKey").value = "";
    document.getElementById("modelSelect").value = "gemini-3-flash-preview";
    document.getElementById("question").value = "";
    animateNotification("Đã xóa cấu hình!", "warning");
    
    const inputs = document.querySelectorAll('.input-style');
    inputs.forEach(input => {
        input.classList.add('animate-gentle-shake');
        setTimeout(() => input.classList.remove('animate-gentle-shake'), 300);
    });
};

function loadConfig() {
    const savedConfig = localStorage.getItem("aetheris_config");
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.username) document.getElementById("username").value = config.username;
        if (config.numCards) document.getElementById("numCards").value = config.numCards;
        if (config.apiKey) document.getElementById("apiKey").value = config.apiKey;
        if (config.model) document.getElementById("modelSelect").value = config.model;
    }
}

function animateNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `fixed top-6 right-6 z-50 px-6 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transform transition-all duration-500 ${
        type === "success" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : 
        "bg-rose-500/20 text-rose-400 border border-rose-500/30"
    } fade-in`;
    notification.textContent = message;
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100px)";
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateX(0)";
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(100px)";
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

async function typeWriter(text, element) {
    element.innerHTML = marked.parse(text);
    element.classList.add("text-blur-in");
    element.classList.add("slide-up");
}

function generatePrompt(name, question, cards) {
    const cardsInfo = cards.map(c => `${c.en} (${c.isRev ? "Ngược" : "Xuôi"})`).join(", ");
    return PROMPT_TEMPLATE
        .replace("{name}", name)
        .replace("{question}", question)
        .replace("{cards}", cardsInfo);
}

async function callGeminiAI(apiKey, modelName, prompt) {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        throw error;
    }
}

async function renderSession(data) {
    currentSessionData = data;
    const area = document.getElementById("readingArea");
    const grid = document.getElementById("cardsGrid");
    const aiArea = document.getElementById("aiResponseArea");
    const aiOutput = document.getElementById("aiMarkdownOutput");
    const apiKey = document.getElementById("apiKey").value;
    const modelName = document.getElementById("modelSelect").value;

    area.style.opacity = "0";
    area.classList.remove("hidden");
    
    setTimeout(() => {
        area.style.opacity = "1";
        area.style.transition = "opacity 0.6s ease-out";
        area.classList.add("fade-in");
    }, 50);
    
    grid.innerHTML = "";
    aiArea.classList.add("hidden");
    aiArea.style.opacity = "0";

    document.getElementById("displayUserName").innerText = data.name;
    document.getElementById("displayQuestion").innerText = `"${data.question}"`;

    for (let i = 0; i < data.cards.length; i++) {
        const card = data.cards[i];
        const cardUI = document.createElement("div");
        cardUI.className = "card-container card-reveal";
        cardUI.style.animationDelay = `${i * 0.1}s`;
        const statusClass = card.isRev ? "text-rose-400" : "text-cyan-400";
        cardUI.innerHTML = `
            <div class="card-wrapper">
                <div class="glass-panel rounded-[2.5rem] p-8 flex flex-col items-center w-full h-full border border-white/10">
                    <div class="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-2">Arcana ${i + 1}</div>
                    <div class="flex-grow flex flex-col items-center justify-center text-center">
                        <div class="text-2xl font-bold text-white ${card.isRev ? "rotate-180" : ""}">${card.vi}</div>
                        <div class="text-[10px] text-slate-500 uppercase tracking-widest mb-4 mt-2">${card.en}</div>
                        <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-5">${card.isRev ? card.reversed : card.upright}</p>
                    </div>
                    <div class="mt-auto pt-4 text-[9px] font-black uppercase ${statusClass} border-t border-white/5 w-full text-center">${card.isRev ? "• Ngược •" : "• Xuôi •"}</div>
                </div>
            </div>`;
        grid.appendChild(cardUI);
        await new Promise((r) => setTimeout(r, 150));
    }

    if (data.aiContent) {
        await new Promise((r) => setTimeout(r, 500));
        aiArea.classList.remove("hidden");
        aiArea.classList.add("fade-in");
        aiOutput.innerHTML = marked.parse(data.aiContent);
        return;
    }

    aiArea.classList.remove("hidden");
    
    if (apiKey) {
        aiOutput.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center space-y-4">
                <div class="loading-oracle"></div>
                <div class="text-[10px] text-cyan-500 uppercase tracking-[0.3em] font-bold">
                    Đang kết nối tinh tú...
                </div>
            </div>
        `;
        
        setTimeout(() => {
            aiArea.classList.add("fade-in");
        }, 300);

        try {
            const prompt = generatePrompt(data.name, data.question, data.cards);
            const text = await callGeminiAI(apiKey, modelName, prompt);
            
            aiOutput.classList.add("text-blur-out");
            await new Promise((r) => setTimeout(r, 300));
            
            await typeWriter(text, aiOutput);
            aiOutput.classList.remove("text-blur-out");
            
            updateHistoryWithAI(data.id, text);
            currentSessionData.aiContent = text;
        } catch (e) {
            aiOutput.innerHTML = `<div class="text-center py-8 fade-in"><p class="text-rose-500 text-xs animate-gentle-shake">Lỗi: ${e.message}</p></div>`;
        }
    } else {
        const promptText = `Vui lòng nhập Gemini API Key để nhận luận giải AI. Hoặc bạn có thể tự phân tích dựa trên các lá bài đã rút: ${data.cards.map(c => `${c.vi} (${c.isRev ? 'Ngược' : 'Xuôi'})`).join(', ')}`;
        aiOutput.innerHTML = `<div class="text-center py-12 fade-in"><p class="text-slate-400 mb-4">${promptText}</p><p class="text-xs text-cyan-400 mt-2">Lưu ý: Bạn có thể lưu API Key trong cấu hình để sử dụng cho lần sau.</p></div>`;
        setTimeout(() => {
            aiArea.classList.add("fade-in");
        }, 300);
    }
}

function saveSessionToHistory(session) {
    let h = JSON.parse(localStorage.getItem("aetheris_history") || "[]");
    h.unshift(session);
    localStorage.setItem("aetheris_history", JSON.stringify(h.slice(0, 10)));
    renderHistory();
}

function updateHistoryWithAI(sessionId, aiContent) {
    let h = JSON.parse(localStorage.getItem("aetheris_history") || "[]");
    const sessionIndex = h.findIndex((s) => s.id === sessionId);
    if (sessionIndex !== -1) {
        h[sessionIndex].aiContent = aiContent;
        localStorage.setItem("aetheris_history", JSON.stringify(h));
        renderHistory();
    }
}

window.startReading = async () => {
    const name = document.getElementById("username").value || "Someone";
    const question = document.getElementById("question").value;
    const count = parseInt(document.getElementById("numCards").value);
    if (!question) {
        animateNotification("Vui lòng nhập câu hỏi!", "warning");
        
        const questionInput = document.getElementById("question");
        questionInput.classList.add('animate-gentle-shake');
        setTimeout(() => questionInput.classList.remove('animate-gentle-shake'), 300);
        return;
    }

    // Xóa cache random cũ bằng cách tạo seed ngẫu nhiên mới
    const clearRandomCache = () => {
        // Tạo mảng bytes ngẫu nhiên để xóa cache random cũ
        const randomBuffer = new Uint32Array(10);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomBuffer);
        }
        // Reset Math.random seed (không hoàn toàn triệt để nhưng giúp giảm pattern)
        randomBuffer.forEach(val => Math.random());
    };

    // Gọi hàm clear cache trước khi bắt đầu random
    clearRandomCache();

    // Thuật toán chọn bài giảm dần
    const availableCards = [...TAROT_DB];
    const drawn = [];
    
    // Lặp 10 lần, mỗi lần chọn một tỷ lệ giảm dần
    for (let i = 0; i < 10; i++) {
        // Clear cache mỗi lần lặp để đảm bảo tính ngẫu nhiên
        if (i > 0) clearRandomCache();
        
        // Tỷ lệ giảm dần từ 90% xuống còn số lá cần chọn
        const remainingSteps = 10 - i;
        const targetSize = Math.max(count, Math.floor(availableCards.length * (0.1 * remainingSteps)));
        
        // Xáo trộn và chọn số lá theo targetSize
        availableCards.sort(() => 0.5 - Math.random());
        
        // Giữ lại số lá theo targetSize
        while (availableCards.length > targetSize) {
            availableCards.pop();
        }
        
        // Nếu đã đủ số lá cần rút, dừng lại
        if (availableCards.length <= count) {
            break;
        }
    }
    
    // Clear cache một lần cuối trước khi chọn lá bài cuối cùng
    clearRandomCache();
    
    // Chọn đúng số lá cần rút từ những lá còn lại
    const finalCards = availableCards
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
        .map((c) => ({ 
            ...c, 
            isRev: Math.random() > 0.7 
        }));
    
    const session = { id: Date.now(), name, question, cards: finalCards };

    saveSessionToHistory(session);
    
    const startButton = event.target;
    startButton.classList.add('animate-gentle-shake');
    setTimeout(() => startButton.classList.remove('animate-gentle-shake'), 300);
    
    renderSession(session);
};

window.clearApiKey = () => {
    localStorage.removeItem("gemini_api_key");
    document.getElementById("apiKey").value = "";
    animateNotification("Đã xóa API Key!", "warning");
    
    const apiKeyInput = document.getElementById("apiKey");
    apiKeyInput.classList.add('animate-gentle-shake');
    setTimeout(() => apiKeyInput.classList.remove('animate-gentle-shake'), 300);
};

window.regenerateAI = () => {
    if (currentSessionData) {
        delete currentSessionData.aiContent;
        const aiArea = document.getElementById("aiResponseArea");
        aiArea.classList.remove("fade-in");
        aiArea.classList.add("fade-out");
        
        const button = event.target.closest('button');
        button.classList.add('animate-gentle-shake');
        setTimeout(() => button.classList.remove('animate-gentle-shake'), 300);
        
        setTimeout(() => {
            aiArea.classList.remove("fade-out");
            renderSession(currentSessionData);
        }, 300);
    }
};

window.deleteSession = (e, id) => {
    e.stopPropagation();
    let h = JSON.parse(localStorage.getItem("aetheris_history") || "[]").filter((s) => s.id !== id);
    localStorage.setItem("aetheris_history", JSON.stringify(h));
    
    const button = e.target.closest('button');
    button.classList.add('animate-gentle-shake');
    setTimeout(() => button.classList.remove('animate-gentle-shake'), 300);
    
    renderHistory();
};

window.replaySession = (id) => {
    const h = JSON.parse(localStorage.getItem("aetheris_history") || "[]").find((s) => s.id == id);
    if (h) {
        const area = document.getElementById("readingArea");
        area.classList.add("fade-out");
        
        const sessionElement = event.target.closest('.bg-white\\/5');
        sessionElement.classList.add('animate-gentle-shake');
        setTimeout(() => sessionElement.classList.remove('animate-gentle-shake'), 300);
        
        setTimeout(() => {
            area.classList.remove("fade-out");
            renderSession(h);
        }, 400);
    }
};

function renderHistory() {
    const box = document.getElementById("historyBox");
    const list = document.getElementById("historyList");
    const h = JSON.parse(localStorage.getItem("aetheris_history") || "[]");
    if (h.length > 0) {
        box.classList.remove("hidden");
        box.classList.add("slide-up");
        list.innerHTML = h
            .map(
                (s, index) => `
            <div class="flex items-center bg-white/5 border border-white/5 rounded-full px-4 py-2 hover:bg-cyan-500/5 transition cursor-pointer slide-up card-hover-glow" style="animation-delay: ${index * 0.05}s" onclick="replaySession(${s.id})">
                <span class="text-[10px] text-slate-300 mr-2">${s.question.substring(0, 15)}...</span>
                <button onclick="deleteSession(event, ${s.id})" class="text-slate-500 hover:text-rose-500 transition-transform hover:scale-110 btn-press"><i class="fas fa-times text-[10px]"></i></button>
            </div>`
            )
            .join("");
    } else {
        box.classList.add("hidden");
    }
}

window.copyResponse = () => {
    const aiOutput = document.getElementById("aiMarkdownOutput");
    const text = aiOutput.innerText;
    navigator.clipboard.writeText(text).then(() => {
        animateNotification("Đã sao chép nội dung!", "success");
        
        const button = event.target.closest('button');
        button.classList.add('animate-gentle-shake');
        setTimeout(() => button.classList.remove('animate-gentle-shake'), 300);
    });

};


