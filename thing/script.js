let shoe = [], playerHand = [], dealerHand = [];
let wins = 0, losses = 0, pushes = 0, totalProfit = 0, lastBet = 0, timerInterval;
let balance = 1000, currentBet = 0, insuranceBet = 0;

const TIME_LIMIT = 10, DECKS_IN_SHOE = 6, RANDOM_SHUFFLE_CHANCE = 0.0314;

// Elements
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const newGameBtn = document.getElementById('new-game-btn');
const surrenderBtn = document.getElementById('surrender-btn');
const rebetBtn = document.getElementById('rebet-btn');
const messageEl = document.getElementById('message');
const progressBar = document.getElementById('progress-bar');
const timerWrapper = document.getElementById('timer-wrapper');
const cardsRemEl = document.getElementById('cards-remaining');
const statWinsEl = document.getElementById('stat-wins');
const statLossesEl = document.getElementById('stat-losses');
const statPushesEl = document.getElementById('stat-pushes');
const prevHandEl = document.getElementById('prev-dealer-hand');
const balanceEl = document.getElementById('player-balance');
const betEl = document.getElementById('total-bet');
const profitEl = document.getElementById('net-profit');
const payoutLog = document.getElementById('payout-logger');
const insuranceOverlay = document.getElementById('insurance-overlay');
const insureCostEl = document.getElementById('insure-cost');

const fmt = (val) => val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

function updateMoneyUI() {
    balanceEl.textContent = fmt(balance);
    betEl.textContent = fmt(currentBet);
    profitEl.textContent = (totalProfit >= 0 ? "+" : "") + fmt(totalProfit);
    profitEl.className = totalProfit >= 0 ? (totalProfit > 0 ? 'plus' : '') : 'minus';
}

function updateDeckUI() { if (cardsRemEl) cardsRemEl.textContent = shoe.length; }

function logPayout(amount, type, customMsg) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    let text = customMsg || (type === 'win' ? `Won ${fmt(amount)}` : type === 'loss' ? `Lost ${fmt(amount)}` : `Push: ${fmt(amount)} back`);
    entry.textContent = text;
    if (payoutLog.querySelector('.empty')) payoutLog.innerHTML = '';
    payoutLog.prepend(entry);
    if (payoutLog.children.length > 5) payoutLog.lastChild.remove();
}

function initShoe() {
    let s = [];
    const suits = ['♠', '♣', '♥', '♦'], vals = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    for (let d = 0; d < DECKS_IN_SHOE; d++) {
        for (let suit of suits) for (let val of vals) s.push({ value: val, suit: suit });
    }
    for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
    }
    shoe = s;
    if (shoe.length > 0) shoe.pop();
    updateDeckUI();
}

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.value);
        if (balance >= val) { currentBet += val; balance -= val; updateMoneyUI(); }
    });
});

document.getElementById('clear-bet').addEventListener('click', () => {
    balance += currentBet; currentBet = 0; updateMoneyUI();
});

rebetBtn.addEventListener('click', () => {
    if (lastBet > 0 && balance >= lastBet) { currentBet = lastBet; balance -= lastBet; updateMoneyUI(); }
});

function startTimer() {
    clearInterval(timerInterval);
    let start = Date.now();
    timerWrapper.classList.remove('hidden-ui');
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = '#2ecc71';
    timerInterval = setInterval(() => {
        let remaining = (TIME_LIMIT * 1000) - (Date.now() - start);
        let pct = Math.max(0, (remaining / (TIME_LIMIT * 1000)) * 100);
        progressBar.style.width = pct + '%';
        if (pct <= 30) progressBar.style.backgroundColor = '#e74c3c';
        if (remaining <= 0) { clearInterval(timerInterval); handleStand(); }
    }, 50);
}

async function startGame() {
    if (currentBet <= 0) { messageEl.textContent = "Place a bet first!"; return; }
    clearInterval(timerInterval);
    
    if (shoe.length < 52 || Math.random() < RANDOM_SHUFFLE_CHANCE) {
        messageEl.textContent = "Reshuffling Shoe...";
        initShoe(); await sleep(1000);
    }
    
    lastBet = currentBet;
    playerHand = []; dealerHand = []; insuranceBet = 0;
    document.getElementById('player-cards').innerHTML = '';
    document.getElementById('dealer-cards').innerHTML = '';
    document.getElementById('dealer-score').textContent = "?";
    document.getElementById('player-score').textContent = "0";
    messageEl.classList.remove('blackjack-text');
    newGameBtn.classList.add('hidden-ui');
    surrenderBtn.classList.remove('hidden-ui');
    toggleBetting(false); toggleControls(false);

    messageEl.textContent = "Dealing...";
    await dealToPlayer(); await sleep(400);
    await dealToDealer(false); await sleep(400);
    await dealToPlayer(); await sleep(400);
    await dealToDealer(true);

    if (dealerHand[0].value === 'A' && balance >= (currentBet / 2)) {
        insureCostEl.textContent = (currentBet / 2).toFixed(2);
        insuranceOverlay.classList.remove('hidden-ui');
    } else { checkInitialState(); }
}

function checkInitialState() {
    if (getScore(playerHand) === 21) {
        messageEl.textContent = "BLACKJACK!"; messageEl.classList.add('blackjack-text');
        handleStand();
    } else {
        messageEl.textContent = "Your turn!"; toggleControls(true); startTimer();
    }
}

document.getElementById('insure-yes').addEventListener('click', () => {
    let cost = currentBet / 2; balance -= cost; insuranceBet = cost;
    updateMoneyUI(); insuranceOverlay.classList.add('hidden-ui'); checkInitialState();
});

document.getElementById('insure-no').addEventListener('click', () => {
    insuranceOverlay.classList.add('hidden-ui'); checkInitialState();
});

async function dealToPlayer() {
    const c = shoe.pop(); playerHand.push(c);
    renderCard(c, 'player-cards', false);
    document.getElementById('player-score').textContent = getScore(playerHand);
    updateDeckUI();
}

async function dealToDealer(isHidden) {
    const c = shoe.pop(); dealerHand.push(c);
    renderCard(c, 'dealer-cards', isHidden);
}

function renderCard(card, elementId, isHidden) {
    const area = document.getElementById(elementId);
    const cardEl = document.createElement('div');
    cardEl.className = isHidden ? 'card hidden-card' : 'card';
    const isRed = (card.suit === '♥' || card.suit === '♦');
    const color = isRed ? 'red-card' : '';
    cardEl.innerHTML = `<div class="card-corner top-left ${color}"><div>${card.value}</div><div>${card.suit}</div></div>
                        <div class="card-suit-center ${color}">${card.suit}</div>`;
    cardEl.style.zIndex = area.children.length;
    area.appendChild(cardEl);
}

function getScore(hand) {
    let s = 0, a = 0;
    for (let c of hand) {
        if (c.value === 'A') { a++; s += 11; }
        else if (['J', 'Q', 'K', '10'].includes(c.value)) s += 10;
        else s += parseInt(c.value);
    }
    while (s > 21 && a > 0) { s -= 10; a--; }
    return s;
}

hitBtn.addEventListener('click', async () => {
    toggleControls(false); clearInterval(timerInterval);
    await dealToPlayer();
    if (getScore(playerHand) >= 21) {
        if (getScore(playerHand) > 21) endGame("Bust! Dealer Wins.");
        else handleStand();
    } else { toggleControls(true); doubleBtn.disabled = true; startTimer(); }
});

standBtn.addEventListener('click', handleStand);

doubleBtn.addEventListener('click', async () => {
    if (balance >= currentBet) {
        balance -= currentBet; currentBet *= 2;
        updateMoneyUI(); toggleControls(false);
        await dealToPlayer();
        if (getScore(playerHand) > 21) endGame("Bust! Dealer Wins.");
        else handleStand();
    }
});

async function handleStand() {
    clearInterval(timerInterval); timerWrapper.classList.add('hidden-ui');
    toggleControls(false);

    document.getElementById('dealer-cards').innerHTML = '';
    dealerHand.forEach(c => renderCard(c, 'dealer-cards', false));
    let dS = getScore(dealerHand);
    document.getElementById('dealer-score').textContent = dS;

    if (insuranceBet > 0 && dS === 21 && dealerHand.length === 2) {
        balance += (insuranceBet * 3); logPayout(insuranceBet * 2, 'win', `Insurance Paid: ${fmt(insuranceBet * 2)}`);
    }

    if (getScore(playerHand) === 21 && playerHand.length === 2) {
        if (dS === 21) endGame("Push!");
        else endGame("BLACKJACK! You Win!");
        return;
    }

    while (getScore(dealerHand) < 17) {
        await sleep(800); const c = shoe.pop();
        dealerHand.push(c); renderCard(c, 'dealer-cards', false);
        document.getElementById('dealer-score').textContent = getScore(dealerHand);
        updateDeckUI();
    }

    const p = getScore(playerHand), d = getScore(dealerHand);
    if (d > 21) endGame("Dealer Busted! You Win!");
    else if (d > p) endGame("Dealer Wins.");
    else if (p > d) endGame("You Win!");
    else { if (d === 21) endGame("Dealer Wins."); else endGame("Push!"); }
}

function endGame(msg) {
    messageEl.textContent = msg; clearInterval(timerInterval);
    timerWrapper.classList.add('hidden-ui'); newGameBtn.classList.remove('hidden-ui');
    surrenderBtn.classList.add('hidden-ui'); toggleControls(false);

    if (msg !== "Surrendered!") {
        if (msg.includes("BLACKJACK!")) {
            let win = currentBet * 1.5; balance += currentBet + win;
            totalProfit += win; wins++; logPayout(win, 'win');
        } else if (msg.includes("You Win") || msg.includes("Busted")) {
            balance += currentBet * 2; totalProfit += currentBet;
            wins++; logPayout(currentBet, 'win');
        } else if (msg.includes("Push")) {
            balance += currentBet; pushes++; logPayout(currentBet, 'push');
        } else { totalProfit -= currentBet; losses++; logPayout(currentBet, 'loss'); }
    } else {
        let refund = currentBet * 0.5; balance += refund;
        totalProfit -= refund; losses++; logPayout(refund, 'loss', `Surrendered: -${fmt(refund)}`);
    }
    
    currentBet = 0; insuranceBet = 0; updateMoneyUI();
    statWinsEl.textContent = wins; statLossesEl.textContent = losses; statPushesEl.textContent = pushes;
    toggleBetting(true); prevHandEl.innerHTML = '';
    dealerHand.forEach(c => renderCard(c, 'prev-dealer-hand', false));
}

function toggleControls(on) {
    hitBtn.disabled = !on; standBtn.disabled = !on;
    doubleBtn.disabled = (!on || playerHand.length > 2 || balance < currentBet);
}

function toggleBetting(on) {
    document.querySelectorAll('.chip').forEach(c => c.disabled = !on);
    document.getElementById('clear-bet').disabled = !on;
    rebetBtn.disabled = !on;
}

newGameBtn.addEventListener('click', startGame);
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
initShoe();
updateMoneyUI();