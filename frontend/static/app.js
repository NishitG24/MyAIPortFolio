const state = {
  profile: null,
  chatHistory: [],
  isSending: false,
  needsEmail: false,
  pendingQuestion: null,
};

const selectors = {
  summary: document.getElementById("summary-text"),
  heroSummary: document.getElementById("hero-summary"),
  skills: document.getElementById("skills-list"),
  experience: document.getElementById("experience-list"),
  projects: document.getElementById("project-list"),
  achievements: document.getElementById("achievement-list"),
  certifications: document.getElementById("certification-list"),
  contactForm: document.getElementById("contact-form"),
  contactStatus: document.getElementById("contact-status"),
  chat: document.getElementById("chat-widget"),
  chatToggle: document.getElementById("chat-toggle"),
  chatClose: document.getElementById("chat-close"),
  chatLog: document.getElementById("chat-log"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
};

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe panels for scroll animations
function observePanels() {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel) => {
    panel.style.opacity = "0";
    panel.style.transform = "translateY(30px)";
    panel.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(panel);
  });
}

async function loadProfile() {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Unable to load profile");
    state.profile = await res.json();
    renderProfile();
    observePanels();
  } catch (error) {
    console.error(error);
    selectors.summary.textContent =
      "Unable to load profile details right now. Please refresh the page.";
  }
}

function renderList(container, items) {
  container.innerHTML = "";
  if (!items?.length) {
    const li = document.createElement("li");
    li.textContent = "No data available.";
    container.appendChild(li);
    return;
  }
  items.forEach((text, index) => {
    const li = document.createElement("li");
    li.textContent = text;
    li.style.opacity = "0";
    li.style.transform = "translateX(-20px)";
    li.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
    container.appendChild(li);
    setTimeout(() => {
      li.style.opacity = "1";
      li.style.transform = "translateX(0)";
    }, 100);
  });
}

function renderChips(container, items) {
  container.innerHTML = "";
  if (!items?.length) {
    container.textContent = "No skills available.";
    return;
  }
  items.forEach((item, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    chip.style.opacity = "0";
    chip.style.transform = "scale(0.8)";
    chip.style.transition = `opacity 0.3s ease ${index * 0.05}s, transform 0.3s ease ${index * 0.05}s`;
    container.appendChild(chip);
    setTimeout(() => {
      chip.style.opacity = "1";
      chip.style.transform = "scale(1)";
    }, 50);
  });
}

function renderExperiences(container, experiences) {
  container.innerHTML = "";
  if (!experiences?.length) {
    container.textContent = "Experience information will appear here when available.";
    return;
  }
  experiences.forEach((exp, index) => {
    const card = document.createElement("article");
    card.className = "experience-card";
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = `opacity 0.5s ease ${index * 0.15}s, transform 0.5s ease ${index * 0.15}s`;
    card.innerHTML = `
      <h3>${exp.role} · ${exp.company}</h3>
      <p class="muted">${exp.period}${exp.location ? " · " + exp.location : ""}</p>
    `;
    if (exp.highlights?.length) {
      const ul = document.createElement("ul");
      exp.highlights.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
    container.appendChild(card);
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100);
  });
}

function renderProfile() {
  const data = state.profile;
  if (!data) return;
  selectors.summary.textContent = data.professional_summary || data.summary;
  selectors.heroSummary.textContent = data.summary;
  renderChips(selectors.skills, data.skills);
  renderExperiences(selectors.experience, data.experiences);
  renderList(selectors.projects, data.projects);
  renderList(selectors.achievements, data.achievements);
  renderList(selectors.certifications, data.certifications);
}

async function submitContact(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  // Ensure message is at least 10 characters to pass backend validation
  if (payload.message && payload.message.length < 10) {
    selectors.contactStatus.textContent = "Message must be at least 10 characters.";
    selectors.contactStatus.style.color = "#ef4444";
    submitButton.disabled = false;
    submitButton.textContent = originalText;
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  selectors.contactStatus.textContent = "Sending...";
  selectors.contactStatus.style.color = "var(--color-primary)";

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Unable to send message");
    }
    selectors.contactStatus.textContent = "✓ Thanks! Your message has been sent successfully!";
    selectors.contactStatus.style.color = "#10b981";
    form.reset();
    
    // Reset button after delay
    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }, 2000);
  } catch (error) {
    selectors.contactStatus.textContent = `✗ ${error.message || "Something went wrong. Please try again."}`;
    selectors.contactStatus.style.color = "#ef4444";
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

function addChatBubble(role, text, isTyping = false) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  if (isTyping) {
    bubble.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
  } else {
    bubble.textContent = text;
  }
  selectors.chatLog.appendChild(bubble);
  selectors.chatLog.scrollTop = selectors.chatLog.scrollHeight;
  return bubble;
}

// Typing animation for chat responses
function typeText(element, text, speed = 30) {
  let i = 0;
  element.textContent = "";
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        selectors.chatLog.scrollTop = selectors.chatLog.scrollHeight;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

function showEmailInput() {
  // Remove existing email input if any
  const existingInput = document.getElementById("email-input-container");
  if (existingInput) existingInput.remove();

  const emailContainer = document.createElement("div");
  emailContainer.id = "email-input-container";
  emailContainer.style.cssText = "padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: 12px; margin-top: 8px;";
  
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.id = "user-email-input";
  emailInput.placeholder = "Enter your email address";
  emailInput.style.cssText = "width: 100%; padding: 8px 12px; border: 2px solid var(--color-primary); border-radius: 8px; font-size: 0.9rem;";
  
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit";
  submitBtn.style.cssText = "width: 100%; margin-top: 8px; padding: 8px; background: var(--primary-gradient); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;";
  
  submitBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) {
      alert("Please enter your email address");
      return;
    }
    
    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    
    // Send the pending question with email
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: state.pendingQuestion, 
          history: state.chatHistory,
          user_email: email
        }),
      });
      
      if (!res.ok) throw new Error("Unable to send");
      const data = await res.json();
      
      emailContainer.remove();
      const responseBubble = addChatBubble("assistant", "");
      await typeText(responseBubble, data.reply);
      state.chatHistory.push({ role: "assistant", content: data.reply });
      state.needsEmail = false;
      state.pendingQuestion = null;
    } catch (error) {
      alert("Failed to submit email. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
  
  emailContainer.appendChild(emailInput);
  emailContainer.appendChild(submitBtn);
  selectors.chatLog.appendChild(emailContainer);
  emailInput.focus();
}

async function submitChat(event) {
  event.preventDefault();
  if (state.isSending) return;
  const message = selectors.chatInput.value.trim();
  if (!message) return;

  addChatBubble("user", message);
  selectors.chatInput.value = "";
  state.chatHistory.push({ role: "user", content: message });
  state.isSending = true;
  state.pendingQuestion = message;
  
  const thinkingBubble = addChatBubble("assistant", "", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: state.chatHistory }),
    });
    if (!res.ok) throw new Error("Unable to chat right now");
    const data = await res.json();
    
    // Remove thinking bubble and add actual response with typing effect
    thinkingBubble.remove();
    const responseBubble = addChatBubble("assistant", "");
    await typeText(responseBubble, data.reply);
    state.chatHistory.push({ role: "assistant", content: data.reply });
    
    // Check if email is needed
    if (data.needs_email) {
      state.needsEmail = true;
      setTimeout(() => showEmailInput(), 500);
    } else {
      state.needsEmail = false;
      state.pendingQuestion = null;
    }
  } catch (error) {
    thinkingBubble.remove();
    const errorBubble = addChatBubble("assistant", "I couldn't respond just now. Please try again.");
    errorBubble.style.color = "#ef4444";
  } finally {
    state.isSending = false;
  }
}

function toggleChat(open) {
  selectors.chat.classList.toggle("open", open);
  if (open) {
    selectors.chatInput.focus();
    // Add welcome message if chat is empty
    if (selectors.chatLog.children.length === 0) {
      setTimeout(() => {
        addChatBubble("assistant", "Hi! I'm Nishit's AI assistant. Ask me anything about his experience, skills, or projects!");
      }, 300);
    }
  }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Add typing indicator CSS
const style = document.createElement("style");
style.textContent = `
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 8px 0;
  }
  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-light);
    animation: typing 1.4s infinite;
  }
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Initialize
selectors.contactForm?.addEventListener("submit", submitContact);
selectors.chatForm?.addEventListener("submit", submitChat);
selectors.chatToggle?.addEventListener("click", () => toggleChat(true));
selectors.chatClose?.addEventListener("click", () => toggleChat(false));

// Close chat on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && selectors.chat.classList.contains("open")) {
    toggleChat(false);
  }
});


// --- BOOKS SECTION ---
const books = [
  {
    title: "THE UNNAMED TRAIN: A Journey To The Station Of Nothing",
    description: `What if the destination you’ve been chasing was never meant to be found—but felt?\nThe Unnamed Train is a deeply reflective and philosophical journey that follows Arjun, a young man who abandons a life of achievements, noise, and restless ambition to board a mysterious train with no name and no fixed route. Guided by an enigmatic conductor and joined by passengers who each embody a lesson of life—the gardener, the musician, the artist, the entrepreneur, and the children—Arjun begins to understand that true fulfillment is not found in reaching somewhere, but in becoming someone.\nAs the train moves through shifting landscapes—from chaos to silence, from striving to surrender—Arjun learns to see success, love, loss, and purpose through new eyes. Each chapter unfolds as a mirror to our own journeys, inviting readers to pause, breathe, and rediscover meaning in the ordinary rhythm of life.\nProfound yet simple, poetic yet practical, The Unnamed Train is a book about letting go of the map, listening to the quiet between destinations, and awakening to the beauty of the present moment.\nA journey that doesn’t take you somewhere new—it takes you back to yourself.`,
    amazon: "https://a.co/d/eQYRSSp",
    image: "https://images-na.ssl-images-amazon.com/images/I/81vR2p1QJGL.jpg"
  },
  {
    title: "Living With Courage and Clarity",
    description: `Unlock Your True Potential with Wisdom from the Bhagavad Gita\nAre you feeling overwhelmed by life’s challenges, stuck in self-doubt, or searching for greater clarity in your decisions? Living With Courage and Clarity is your roadmap to overcoming life's uncertainties with purpose, resilience, and confidence.\nRooted in the timeless teachings of the Bhagavad Gita, this transformative self-help guide is crafted for individuals seeking practical strategies to align their actions with their deepest values. It’s a must-read for those eager to:\nFace fears with courage and embrace life’s transitions.\nAchieve mental clarity to make decisions that truly matter.\nTurn challenges into opportunities for growth.\nBuild balance, resilience, and lasting emotional well-being.\nWhether you're on a journey of personal growth, seeking spiritual grounding, or looking for actionable steps to lead a more meaningful life, this book provides the tools and insights you need.\nWhy Add It to Your Cart Today?\nActionable Wisdom: Filled with relatable examples, exercises, and reflections you can apply immediately.\nTimeless Inspiration: Blends ancient philosophy with modern-day relevance, making it perfect for anyone navigating today’s fast-paced world.\nEmpowering Guidance: Written with heart and expertise, it inspires you to transform struggles into stepping stones for a fulfilling life.`,
    amazon: "https://a.co/d/8h4XZVM",
    image: "https://images-na.ssl-images-amazon.com/images/I/81QFQKQJQXL.jpg"
  },
  {
    title: "The 9 Effect: Why Odd Prices Sell More: The Secret Power of Ending Prices in 9",
    description: `Ever wondered why ₹999 feels so much cheaper than ₹1,000?\nIt’s not magic—it’s pricing psychology, and it’s everywhere. The 9 Effect unpacks the secret behind odd prices like ₹999, ₹659, and ₹1,997—how they trick your brain, influence your wallet, and boost sales across the globe.\nWith relatable stories, real examples, and a friendly tone, this book will change the way you see every price tag.\nSmart, fun, and eye-opening—this book will make you a sharper shopper and a smarter seller.\nIf this sounds interesting, go ahead—add it to your cart. You're already under budget.`,
    amazon: "https://a.co/d/5d0qQG0",
    image: "https://images-na.ssl-images-amazon.com/images/I/81bGQKQJQXL.jpg"
  },
  {
    title: "Discover the Ram in You: How to Embrace and Implement Ram’s Timeless Qualities in Daily Life",
    description: `Discover the Ram in You is more than just a book—it is a journey of self-discovery, inspired by the timeless virtues of Ram. Through the transformative story of Hector and Selena, two seekers from different backgrounds, this book explores the essence of Dharma (righteousness), Satya (truth), Karuna (compassion), Maryada (respect), and Ram Rajya (ideal leadership) and how these qualities can be applied in modern life.\nGuided by Sage Sharad Chandra, Hector and Selena travel through India, learning profound lessons that reshape their understanding of themselves and the world around them. Their journey is not about finding Ram in temples or scriptures but about discovering his values within their own hearts.\nThis book is a blend of philosophy, storytelling, and practical wisdom, designed to help readers integrate Ram’s teachings into their daily lives. It offers self-reflection exercises, meditation practices, and actionable steps to embody these virtues, making it a guide for personal transformation, ethical leadership, and inner peace.\nWhether you are on a spiritual quest, seeking personal growth, or looking for a deeper meaning in life, Discover the Ram in You will inspire you to walk the path of truth, compassion, and righteousness.`,
    amazon: "https://a.co/d/eQZJHAh",
    image: "https://images-na.ssl-images-amazon.com/images/I/81cQKQJQXL.jpg"
  }
];

function renderBooks() {
  const booksList = document.getElementById('books-list');
  if (!booksList) return;
  booksList.innerHTML = books.map(book => `
    <div class="book-card">
      <div class="book-info">
        <h3>${book.title}</h3>
        <p>${book.description.replace(/\n/g, '<br>')}</p>
        <a href="${book.amazon}" target="_blank" rel="noopener" class="btn secondary">View on Amazon</a>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderBooks();

  // Smooth scroll for nav tabs
  document.querySelectorAll('.nav-tabs a').forEach(tab => {
    tab.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href').replace('#', '');
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 60,
          behavior: 'smooth'
        });
      }
    });
  });
});

loadProfile();
