const wheelNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// 1. Populate the Table
const grid = document.getElementById('numbers-grid');
function drawTable() {
    grid.innerHTML = '';
    for (let i = 1; i <= 36; i++) {
        const div = document.createElement('div');
        const isRed = redNumbers.includes(i);
        div.className = `bet-node ${isRed ? 'red-bg' : 'black-bg'}`;
        div.textContent = i;
        grid.appendChild(div);
    }
}

// 2. Populate the Wheel Strip
const strip = document.getElementById('wheel-strip');
function drawWheel() {
    strip.innerHTML = '';
    // Repeat numbers 3 times so there's enough length to "scroll"
    const displayList = [...wheelNumbers, ...wheelNumbers, ...wheelNumbers];
    displayList.forEach(num => {
        const div = document.createElement('div');
        const isRed = redNumbers.includes(num);
        const color = num === 0 ? 'bet-zero' : (isRed ? 'red-bg' : 'black-bg');
        div.className = `wheel-num ${color}`;
        div.textContent = num;
        strip.appendChild(div);
    });
}

const trackPath = document.getElementById('racetrack-path');

function drawRacetrack() {
    trackPath.innerHTML = '';
    // Use the wheelNumbers array which has the correct sequence [0, 32, 15...]
    wheelNumbers.forEach(num => {
        const div = document.createElement('div');
        const isRed = redNumbers.includes(num);
        const colorClass = num === 0 ? 'bet-zero' : (isRed ? 'red-bg' : 'black-bg');
        
        div.className = `track-node ${colorClass}`;
        div.textContent = num;
        
        trackPath.appendChild(div);
    });
}

// Call this inside your init/start sequence
drawRacetrack();
drawTable();
