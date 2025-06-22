
class Member {
    constructor(id, teamName, tag) {
        this.isActive = true;
        this.id = id;
        this.teamName = teamName;
        this.tag = tag;
    }

    toggleActive() {
        this.isActive = !this.isActive;
    }
}

class Team {
    constructor(teamName, teamId) {
        this.teamName = teamName;
        this.teamId = teamId;
        this.members = [];
    }
}

let initialRoundNum = 1; //初期の席替え回数
let roundNum = initialRoundNum; //ラウンド数（席替えしたら増える）
let teams = [];
let allMembers = [];
let pairHistory = new Map(); //ペアの同チーム履歴を記録する用のマップ

function getPairKey(memberId1, memberId2) {
    return memberId1 < memberId2 ? `${memberId1}-${memberId2}` : `${memberId2}-${memberId1}`;
}

function recordCurrentTeams() {
    //現在のチーム構成をペア履歴に記録
    teams.forEach(team => {
        const activeTeamMembers = team.members.filter(m => m.isActive);
        for (let i = 0; i < activeTeamMembers.length; i++) {
            for (let j = i + 1; j < activeTeamMembers.length; j++) {
                const pairKey = getPairKey(activeTeamMembers[i].id, activeTeamMembers[j].id);
                pairHistory.set(pairKey, (pairHistory.get(pairKey) || 0) + 1); //map(key=ペア名, value=ペアになった回数)のvalueを更新
            }
        }
    });
}

function getPairHistoryCount(member1, member2) {
    const pairKey = getPairKey(member1.id, member2.id);
    return pairHistory.get(pairKey) || 0;
}

function calculateTeamScore(teamMembers) {
    //チーム内のペア履歴の合計（少ないほど良い）
    let score = 0;
    for (let i = 0; i < teamMembers.length; i++) {
        for (let j = i + 1; j < teamMembers.length; j++) {
            score += getPairHistoryCount(teamMembers[i], teamMembers[j]);
        }
    }
    return score;
}

function initializeTeams() {
    const teamCount = parseInt(document.getElementById('teamCount').value);
    const membersPerTeam = parseInt(document.getElementById('membersPerTeam').value);
    
    roundNum = initialRoundNum; //席替え回数をリセット
    teams = [];
    allMembers = [];
    pairHistory.clear(); //履歴をリセット
    let memberId = 0;

    for (let i = 0; i < teamCount; i++) {
        const teamName = String.fromCharCode(65 + i); //A, B, C...
        const team = new Team(teamName, i);
        
        for (let j = 0; j < membersPerTeam; j++) {
            const tag = `${teamName.toLowerCase()}-${j + 1}`;
            const member = new Member(memberId++, teamName, tag);
            team.members.push(member);
            allMembers.push(member);
        }
        
        teams.push(team);
    }

    const roundLabel = document.getElementById('roundLabel');
    roundLabel.innerHTML = `<strong>現在のラウンド:</strong><span id="roundNumber">1</span>`;

    displayRoundNum(); //初期化時に席替え回数を表示
    recordCurrentTeams();
    displayTeams();
}

function displayTeams() {
    const container = document.getElementById('teamsDisplay');
    container.innerHTML = '';

    teams.forEach(team => {
        const teamBox = document.createElement('div');
        teamBox.className = 'team-box';
        
        const teamTitle = document.createElement('div');
        teamTitle.className = 'team-title';
        teamTitle.textContent = `チーム ${AlphToNum(team.teamName) + 1}`; //A = 1, B = 2, C = 3...
        teamBox.appendChild(teamTitle);

        const memberButtons = document.createElement('div');
        memberButtons.className = 'member-buttons';

        team.members.forEach(member => {
            const button = document.createElement('button');
            button.className = `member-btn ${member.isActive ? '' : 'inactive'}`;
            button.textContent = member.tag;
            button.onclick = () => toggleMember(member.id);
            memberButtons.appendChild(button);
        });

        teamBox.appendChild(memberButtons);
        container.appendChild(teamBox);
    });
}

function toggleMember(memberId) {
    const member = allMembers.find(m => m.id === memberId);
    if (member) {
        member.toggleActive();
        displayTeams();
    }
}

function shuffleTeams() {
    const activeMembers = allMembers.filter(m => m.isActive);
    const teamCount = teams.length;
    const baseMembersPerTeam = Math.floor(activeMembers.length / teamCount);
    const extraMembers = activeMembers.length % teamCount;
    
    if (activeMembers.length < teamCount) {
        alert('アクティブなメンバーが少なすぎます');
        return;
    }

    //現在のチーム構成を履歴に記録
    recordCurrentTeams();

    //初対面を最大化するチーム配置を生成
    const bestTeamAssignment = optimizeTeamAssignment(activeMembers, teamCount, baseMembersPerTeam, extraMembers);

    //全てのメンバーを一度全チームから削除
    teams.forEach(team => {
        team.members = [];
    });

    //最適化されたチーム配置を適用
    bestTeamAssignment.forEach((teamMembers, teamIndex) => {
        const team = teams[teamIndex];
        teamMembers.forEach(member => {
            member.teamName = team.teamName;
            team.members.push(member);
        });
    });

    //非アクティブメンバーを元のチームに戻す
    allMembers.filter(m => !m.isActive).forEach(member => {
        const originalTeamName = member.teamName;
        const team = teams.find(t => t.teamName === originalTeamName);
        if (team) {
            team.members.push(member);
        }
    });

    displayRoundNum();
    displayTeams();
}

function optimizeTeamAssignment(activeMembers, teamCount, baseMembersPerTeam, extraMembers) {
    let bestAssignment = null;
    let bestScore = Infinity;
    const maxIterations = 1000; //最適化の試行回数

    for (let ite = 0; ite < maxIterations; ite++) {
        //ランダムシャッフル
        const shuffledMembers = [...activeMembers];
        for (let i = shuffledMembers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledMembers[i], shuffledMembers[j]] = [shuffledMembers[j], shuffledMembers[i]];
        }

        //チームに配置
        const assignment = [];
        let memberIndex = 0;
        for (let i = 0; i < teamCount; i++) {
            const targetSize = baseMembersPerTeam + (i < extraMembers ? 1 : 0);
            const teamMembers = [];
            for (let j = 0; j < targetSize && memberIndex < shuffledMembers.length; j++) {
                teamMembers.push(shuffledMembers[memberIndex++]);
            }
            assignment.push(teamMembers);
        }

        //スコア計算（全チームのペア履歴合計）
        let totalScore = 0;
        assignment.forEach(teamMembers => {
            totalScore += calculateTeamScore(teamMembers);
        });

        //より良いスコアなら更新
        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestAssignment = assignment.map(team => [...team]);
        }

        //完璧なスコア（全て初対面）なら早期終了
        if (totalScore === 0) {
            break;
        }
    }

    return bestAssignment;
}

function displayRoundNum() {
    const roundCount = document.getElementById('roundNumber');
    roundCount.textContent = `${roundNum}`; //ラウンド数を表示
    roundNum++;
}

function AlphToNum(str) {
    let num = 0;
    for (let i = 0; i < str.length; i++) {
        num = num * 26 + (str.charCodeAt(i) - 'A'.charCodeAt(0));
    }
    return num;
}
