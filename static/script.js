const orb = document.getElementById("orb");
const subtitleBox = document.getElementById("subtitles") || document.getElementById("subtitle-container");
const stopButton = document.getElementById("stop-button");
let currentAudio = null;
let recognition;
let isListening = false;

function setOrbState(state) {
    if (!orb) return;
    orb.classList.remove("orb-idle", "orb-thinking", "orb-speaking");
    orb.classList.add("orb-" + state);
}

async function speak(text) {
    try {
        setOrbState("thinking");
        subtitleBox.textContent = text;
        const response = await fetch("/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        if (data.audio) {
            setOrbState("speaking");
            if (currentAudio) currentAudio.pause();
            currentAudio = new Audio(data.audio);
            currentAudio.play();
            currentAudio.onended = () => {
                setOrbState("idle");
                setTimeout(() => startListening(), 1000);
            };
        } else {
            setOrbState("speaking");
            setTimeout(() => {
                setOrbState("idle");
                startListening();
            }, 3000);
        }
    } catch (err) {
        console.error("Error:", err);
        setOrbState("idle");
    }
}

function startListening() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support voice recognition");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => { isListening = true; };
    recognition.onend = () => { isListening = false; };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceTranscript(transcript);
    };

    recognition.start();
}

function handleVoiceTranscript(transcript) {
    userInput.value = transcript;
    askButton.click();
}

stopButton?.addEventListener("click", () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    subtitleBox.textContent = "";
    setOrbState("idle");
});

const heyLuminaBtn = document.getElementById("hey-lumina-button");
heyLuminaBtn?.addEventListener("click", () => {
    speak("Welcome to Lumina Legacy. I am your AI assistant.");
});

const askButton = document.getElementById("ask-lumina");
const userInput = document.getElementById("user-input");

if (askButton && userInput) {
    askButton.addEventListener("click", async () => {
        const question = userInput.value.trim();
        if (question.length > 0) {
            try {
                const response = await fetch("/ask", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                });
                const data = await response.json();
                if (data.reply) {
                    speak(data.reply);
                    showCTA(data.cta);
                }
            } catch (err) {
                console.error("Error:", err);
            }
            userInput.value = "";
        }
    });

    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askButton.click();
        }
    });
}

async function loadMilestones() {
    const res = await fetch("/timeline");
    const data = await res.json();
    const list = document.getElementById("milestone-list");
    if (data && data.timeline && data.timeline.length) {
        list.innerHTML = data.timeline.map(m => `<div>📅 ${m.date}: ${m.event}</div>`).join("");
    } else {
        list.innerHTML = "<div>No milestones recorded yet.</div>";
    }
}

async function loadMemoryForm() {
    const res = await fetch("/memory");
    const data = await res.json();
    if (data) {
        document.querySelector("input[name='name']").value = data.personal.name || "";
        document.querySelector("input[name='goal']").value = data.business.goal || "";
        document.querySelector("input[name='voice_style']").value = data.preferences.voice_style || "";
        document.querySelector("input[name='income_target']").value = data.business.income_target || "";
        document.querySelector("input[name='mood']").value = data.emotional.recent_state || "";
    }
}

const memoryForm = document.getElementById("memory-form");
memoryForm?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const body = {
        name: this.name.value,
        goal: this.goal.value,
        voice_style: this.voice_style.value,
        income_target: this.income_target.value,
        mood: this.mood.value
    };
    await fetch("/update-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    alert("✅ Memory updated!");
});

window.onload = () => {
    loadMilestones?.();
    loadMemoryForm?.();
    startListening();
};

const ctaButton = document.createElement("button");
ctaButton.id = "cta-button";
ctaButton.style.display = "none";
ctaButton.style.marginTop = "16px";
ctaButton.style.padding = "10px 20px";
ctaButton.style.borderRadius = "8px";
ctaButton.style.border = "none";
ctaButton.style.background = "#8F00FF";
ctaButton.style.color = "#fff";
ctaButton.style.fontSize = "16px";
ctaButton.style.cursor = "pointer";
subtitleBox?.parentNode?.appendChild(ctaButton);

function showCTA(tier) {
    let text = "", url = "";
    if (tier === "spark") {
        text = "Get Started with Lumina Spark ($297)";
        url = "https://buy.stripe.com/test_00wfZacRcgHV1SA0W2awo00";
    } else if (tier === "ignite") {
        text = "Book Lumina Ignite ($997)";
        url = "https://buy.stripe.com/test_cNi7sE3gC1N1eFm6gmawo01";
    } else if (tier === "sovereign") {
        text = "Launch with Lumina Sovereign ($2222)";
        url = "https://buy.stripe.com/test_eVqeV68AWgHV0OwcEKawo02";
    } else {
        ctaButton.style.display = "none";
        return;
    }
    ctaButton.textContent = text;
    ctaButton.onclick = () => window.open(url, "_blank");
    ctaButton.style.display = "inline-block";
}
