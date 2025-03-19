document.addEventListener('DOMContentLoaded', async () => {
    let activeTab;
    let hello;
    let id;
    let comment_id;
    let false_tab;
    let user_data;
    let cleaned_url;
    // Track connected users for the current user
    let userConnections = [];
    
    chrome.storage.sync.get("userInfo", async (data) => {
        console.log(data.userInfo); 
        user_data = data.userInfo;
        login();
        // Load user connections after login
        loadUserConnections();
    });
    
    const acttabarr = [];
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        activeTab = tabs[0];
        acttabarr.push(activeTab.id);
        hello = activeTab.url;
        fetchComments(hello);
    });
    
    async function login() {
        try {
            const value = user_data.name;
            const response = await fetch(`http://localhost:8080/login/${value}`);
            if (!response.ok) throw new Error('Failed to fetch replies');
            const repliesData = await response.json();
            console.log(repliesData.user_id);
            id = repliesData.user_id;
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }
    
    // Load user connections from the database
    async function loadUserConnections() {
        try {
            const response = await fetch(`http://localhost:8080/user_connections/${id}`);
            if (!response.ok) throw new Error('Failed to fetch user connections');
            const data = await response.json();
            userConnections = data.connections;
            console.log("Loaded user connections:", userConnections);
        } catch (error) {
            console.error('Error loading user connections:', error);
            userConnections = [];
        }
    }
    
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab) {
                if (tab.active) {
                    console.log("Tab switched to:", tab.url);
                    if (acttabarr.includes(tab.id)) {
                        fetchComments(tab.url);
                        document.getElementById("container").style.display = "block";
                        document.getElementById("open").style.display = "none";
                    } else {
                        false_tab = tab;
                        document.getElementById("container").style.display = "none";
                        document.getElementById("open").style.display = "block";

                        chrome.sidePanel.setOptions({
                            tabId: tab.id,
                            enabled: false,
                            path: 'sidepanel-tab.html' // Replace with your panel HTML file
                        });
                    }
                }
            }
        });
    });

    const new_butt = document.getElementById("open");
    new_butt.addEventListener('click', openComment);

    function openComment() {
        acttabarr.push(false_tab.id);
        fetchComments(false_tab.url);
        document.getElementById("container").style.display = "block";
        document.getElementById("open").style.display = "none";
    }

    const commentsList = document.getElementById('commentsList');
    const newCommentText = document.getElementById('newCommentText');
    const submitComment = document.getElementById('submitComment');
    const sortCommentsButton = document.getElementById('sortComments');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Add a new button for sorting by connections
    const sortByTypeDropdown = document.createElement('select');
    sortByTypeDropdown.id = 'sortByType';
    sortByTypeDropdown.innerHTML = `
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="connections">Show Connections First</option>
    `;
    
    // Insert dropdown after the sort button
    sortCommentsButton.parentNode.insertBefore(sortByTypeDropdown, sortCommentsButton.nextSibling);
    
    // Update sorting to use the dropdown
    sortCommentsButton.textContent = "Sort";
    
    let comments = [];
    
    function renderComments(commentsToRender) {
        commentsList.innerHTML = ''; // Clear existing comments
        commentsToRender.forEach(comment => {
            const replyCount = comment.reply_count !== undefined ? comment.reply_count : 0;
            const isConnected = userConnections.includes(comment.user_id);
            
            const commentCard = document.createElement('div');
            commentCard.classList.add('comment_container');
            
            // Add a special class if this is from a connected user
            if (isConnected) {
                commentCard.classList.add('connected-user-comment');
            }
            
            commentCard.innerHTML = `
                <div class="comment_card">
                    <div class="comment_header" style="flex-direction: row;margin-bottom: 0.5rem;justify-content: space-between;">
                        <div class="comment_user" style="display: flex;flex-direction: row;align-items: anchor-center;justify-content: start;">
                            <img class="comment_user_image" src="${comment.profile_pic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="${comment.name}'s profile picture" />
                            <h3 style="margin-left:9px;" class="comment_title">${comment.username}</h3>
                            ${isConnected ? '<span class="connection-badge" style="margin-left: 5px; background-color: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">Connected</span>' : ''}
                        </div>
                        <span class="comment_timestamp">${getTimeDifferenceFromNow(comment.created_at)}</span>
                    </div>
                    <p class="comment_content">${comment.comment}</p>
                    <div class="comment_footer">
                        <div class="comment_actions">
                            <button class="action-button like-button" data-comment-id="${comment.id}">
                                <i class="fas fa-thumbs-up"></i> <span class="like-count">${comment.like_count || 0}</span>
                            </button>
                            <button class="action-button dislike-button" data-comment-id="${comment.id}">
                                <i class="fas fa-thumbs-down"></i> <span class="dislike-count">${comment.dislike_count || 0}</span>
                            </button>
                            <button class="action-button connect-button" data-user-id="${comment.user_id}" data-username="${comment.username}" ${isConnected ? 'disabled' : ''}>
                                <i class="fas fa-user-plus"></i> ${isConnected ? 'Connected' : 'Connect'}
                            </button>
                            <span class="sentiment-score">
                                ${getSentimentEmoji(comment.sentiment_score)} 
                                ${comment.sentiment_score ? comment.sentiment_score.toFixed(2) : 'N/A'}
                            </span>
                        </div>
                        <div class="show-replies" data-comment-id="${comment.id}">Replies (${replyCount})</div>
                    </div>
                    <div class="nested-comments" id="replies-${comment.id}"></div>
                    <div class="reply-form">
                        <input type="text" class="reply-input" placeholder="Write a reply..." style="display:none;">
                        <button class="reply-button" data-comment-id="${comment.id}" style="display:none;">Submit</button>
                        <button class="reply">Reply</button>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentCard);
        });
        
        document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', handleVote);
        });

        document.querySelectorAll('.reply-button').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', handleReply);
        });

        document.querySelectorAll('.show-replies').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', showReply);
        });
        
        document.querySelectorAll('.connect-button').forEach(button => {
            button.addEventListener('click', handleConnect);
        });
        
        document.querySelectorAll('.reply').forEach(button => {
            button.addEventListener('click', () => {
                // Get the parent .reply-form element of the clicked .reply button
                const replyForm = button.closest('.reply-form');
                // Toggle the display of the .reply-input and .reply-button
                const replyInput = replyForm.querySelector('.reply-input');
                const replyButton = replyForm.querySelector('.reply-button');
                
                // Toggle the display between 'none' and 'block'
                const currentDisplay = replyInput.style.display;
                if (currentDisplay === 'none' || currentDisplay === '') {
                    replyInput.style.display = 'block';
                    replyButton.style.display = 'block';
                    button.style.display='none';
                } else {
                    replyInput.style.display = 'none';
                    replyButton.style.display = 'none';
                }
            });
        });
    }
    
    // Handle connect button clicks
    async function handleConnect(event) {
        const button = event.currentTarget;
        const targetUserId = button.dataset.userId;
        const targetUsername = button.dataset.username;
        
        if (targetUserId === id.toString()) {
            alert("You cannot connect to yourself");
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:8080/connect_users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: id,
                    target_user_id: parseInt(targetUserId),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to establish connection');
            }
            
            // Update local userConnections array
            if (!userConnections.includes(parseInt(targetUserId))) {
                userConnections.push(parseInt(targetUserId));
            }
            
            // Update button appearance
            button.innerHTML = '<i class="fas fa-user-check"></i> Connected';
            button.disabled = true;
            
            // Add connection badge to all comments from this user
            document.querySelectorAll(`.connect-button[data-user-id="${targetUserId}"]`).forEach(btn => {
                btn.innerHTML = '<i class="fas fa-user-check"></i> Connected';
                btn.disabled = true;
                
                // Add connection badge to the user's name
                const userHeader = btn.closest('.comment_card').querySelector('.comment_user');
                if (!userHeader.querySelector('.connection-badge')) {
                    const badge = document.createElement('span');
                    badge.classList.add('connection-badge');
                    badge.style.marginLeft = '5px';
                    badge.style.backgroundColor = '#4CAF50';
                    badge.style.color = 'white';
                    badge.style.padding = '2px 6px';
                    badge.style.borderRadius = '10px';
                    badge.style.fontSize = '0.8em';
                    badge.textContent = 'Connected';
                    userHeader.appendChild(badge);
                }
            });
            
            console.log(`Connected with user ${targetUsername} (ID: ${targetUserId})`);
            
            // Refresh comments if sorted by connections
            if (sortByTypeDropdown.value === 'connections') {
                sortComments();
            }
            
        } catch (error) {
            console.error('Error connecting with user:', error);
            alert('Failed to establish connection. Please try again.');
        }
    }

    function showReply(event) {
        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const repliesContainer = document.getElementById(`replies-${commentId}`);

        if (repliesContainer.style.display === 'none' || !repliesContainer.style.display) {
            repliesContainer.style.display = 'block';
            fetchReplies(commentId, repliesContainer);
        } else {
            repliesContainer.style.display = 'none';
        }
    }

    async function fetchReplies(commentId, container) {
        try {
            console.log(commentId);
            const response = await fetch(`http://localhost:8080/replie/${commentId}`);
            if (!response.ok) throw new Error('Failed to fetch replies');
            
            const repliesData = await response.json();
            console.log(repliesData);

            // Render replies
            container.innerHTML = '';
            
            repliesData.forEach(reply => {
                const isConnected = userConnections.includes(reply.user_id);
                const replyElement = document.createElement('div');
                replyElement.classList.add('comment_container');
                
                // Add a special class if this is from a connected user
                if (isConnected) {
                    replyElement.classList.add('connected-user-comment');
                }
                
                // Correctly reference properties of `reply`
                replyElement.innerHTML = `
                    <div class="comment_card">
                        <div class="comment_header">
                            <div class="comment_user" style="display: flex;flex-direction: row;align-items: center;">
                                <h3 class="comment_title">${reply.username}</h3>
                                ${isConnected ? '<span class="connection-badge" style="margin-left: 5px; background-color: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">Connected</span>' : ''}
                            </div>
                            <span class="comment_timestamp">${getTimeDifferenceFromNow(reply.created_at)}</span>
                        </div>
                        <p class="comment_content">${reply.comment}</p>
                        <div class="comment_footer">
                            <div class="comment_actions">
                                <button class="action-button connect-button" data-user-id="${reply.user_id}" data-username="${reply.username}" ${isConnected ? 'disabled' : ''}>
                                    <i class="fas fa-user-plus"></i> ${isConnected ? 'Connected' : 'Connect'}
                                </button>
                                <span class="sentiment-score">
                                    ${getSentimentEmoji(reply.sentiment_score)} 
                                    ${reply.sentiment_score ? reply.sentiment_score.toFixed(2) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(replyElement);
            });
            
            // Add event listeners to connect buttons in replies
            container.querySelectorAll('.connect-button').forEach(button => {
                button.addEventListener('click', handleConnect);
            });
        } catch (error) {
            console.error('Error fetching replies:', error);
        }
    }

    function getSentimentEmoji(score) {
        if (score === null || score === undefined) return '';
        if (score == 5) return '😍';
        if (score == 4) return '😊';
        if (score == 3) return '🙂';
        if (score == 2) return '😐';
        if (score == 1) return '🙁';
        return '😢';
    }

async function handleVote(event) {
    const button = event.currentTarget;
    const commentId = button.dataset.commentId;
    const isLike = button.classList.contains('like-button');
    console.log(commentId);

    const likeButton = document.querySelector(`.like-button[data-comment-id="${commentId}"]`);
    const dislikeButton = document.querySelector(`.dislike-button[data-comment-id="${commentId}"]`);
    const likeCountSpan = likeButton.querySelector('.like-count');
    const dislikeCountSpan = dislikeButton.querySelector('.dislike-count');

    let likeCount = parseInt(likeCountSpan.textContent);
    let dislikeCount = parseInt(dislikeCountSpan.textContent);

    try {
        const response = await fetch(`http://localhost:8080/comment_like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                is_like: Boolean(isLike),
                user_id: Number(id), // Replace with actual user ID
                comment_id: Number(commentId),
            }),
        });
        console.log(isLike)

        if (!response.ok) {
            throw new Error('Failed to update vote count');
        }

        const data = await response.json();
        switch (data.status) {
            case "1": // First time like/dislike
                if (isLike) {
                    likeCount++;
                    likeCountSpan.textContent = likeCount;
                } else {
                    dislikeCount++;
                    dislikeCountSpan.textContent = dislikeCount;
                }
                break;
            case "2": // Already liked and trying to like again (No action)
            case "3": // Already disliked and trying to dislike again (No action)
                if (isLike) {
                    likeCount--;
                    likeCountSpan.textContent = likeCount;
                } else {
                    dislikeCount--;
                    dislikeCountSpan.textContent = dislikeCount;
                }
                break;
            case "4": // User liked before and now dislikes (Remove like, add dislike)
                likeCount--;
                dislikeCount++;
                likeCountSpan.textContent = likeCount;
                dislikeCountSpan.textContent = dislikeCount;
                break;
            case "5": // User disliked before and now likes (Remove dislike, add like)
                dislikeCount--;
                likeCount++;
                dislikeCountSpan.textContent = dislikeCount;
                likeCountSpan.textContent = likeCount;
                break;
        }

        console.log(`Vote updated: ${data.status}`);
    } catch (error) {
        console.error('Error sending vote to backend:', error);
    }
}


async function handleReply(event) {
    const button = event.currentTarget;
    const replyInput = button.previousElementSibling;
    const replyButton = button.nextElementSibling;
    const replyText = replyInput.value.trim();
    
    // Get the comment ID from the button's parent (assumes show-replies has the correct id format)
    const repliesContainer = button.closest('.comment_card').querySelector('.nested-comments');
    const commentID = repliesContainer.id.split('-')[1];  // Split the ID and get the actual comment ID

    console.log('Replying to comment:', commentID);

    // Prepare the comment data for the reply
    const comment = {
        comment: replyText,
        username: user_data.name,
        id: id,
        url: cleaned_url,
        parent_id: parseInt(commentID),  // Parent comment ID to link this reply
        sentiment_score: 2,
        LikeCount: 0,
        DislikeCount: 0,
        profile_pic: user_data.picture,
        created_at: new Date()
    };

    console.log(`Replying with comment data:`);
    console.log(comment);

    try {
        // Send the reply to the backend
        const newComment = await fetch(`http://localhost:8080/replies/${commentID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(comment),
        });

        const repliesContainer = document.getElementById(`replies-${commentID}`);
        const replyElement = document.createElement('div');
        replyElement.classList.add('comment_container');
        replyElement.innerHTML = `
            <div class="comment_card">
                <div class="comment_header">
                    <h3 class="comment_title">${comment.username}</h3>
                    <span class="comment_timestamp">${getTimeDifferenceFromNow(comment.created_at)}</span>
                </div>
                <p class="comment_content">${replyText}</p>
                <div class="comment_footer">
                    <div class="comment_actions">
                        <span class="sentiment-score">
                            ${comment.sentiment_score}  <!-- Sentiment score can be added here -->
                        </span>
                    </div>
                </div>
            </div>
        `;
        repliesContainer.appendChild(replyElement);
        replyInput.value = '';

        // Fix: Define parentComment to update the reply count
        const parentComment = button.closest('.comment_card');
        const replyCountElement = parentComment.querySelector('.show-replies');
        const currentCount = parseInt(replyCountElement.textContent.match(/\d+/)[0]);
        replyCountElement.textContent = `Replies (${currentCount + 1})`;

        console.log(`Replied to comment ${commentID}: ${replyText}`);
    } catch (error) {
        console.error('Error posting reply:', error);
    }

    // Hide the reply input after submitting
    button.style.display = 'none';
    replyInput.style.display = 'none';
    replyButton.style.display = 'block';
}


    // Fetch and render comments
    async function fetchComments(url) {
        try {
            cleaned_url = url.replace("https://", "")
            currentPageUrl = await encodeURIComponent(cleaned_url); 
            console.log(currentPageUrl);

            const response2 = await fetch(`http://localhost:8080/comments?url=${currentPageUrl}&user_id=${id}`);
            if (!response2.ok) throw new Error('Failed to fetch comments');
            const commentsData = await response2.json();
            console.log(commentsData);
            renderComments(commentsData);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }
function getTimeDifferenceFromNow(backendTime) {
    // Get the current time in UTC
    const currentTime = new Date();

    // Parse the backend time (which is already in UTC) into a Date object
    const backendDate = new Date(backendTime);

    // Get the difference in milliseconds between current time and backend time
    const diffInMilliseconds = currentTime - backendDate;

    // Convert milliseconds to various units
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Create a human-readable format
    let result = '';
    if (diffInDays > 0) {
        result = `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
        result = `${diffInHours}hr ago`;
    } else if (diffInMinutes > 0) {
        result = `${diffInMinutes}min ago`;
    } else {
        result = `${diffInSeconds}s ago`;
    }

    return result;
}



    // Handle posting a new comment
    submitComment.addEventListener('click', async () => {
       
        const message = newCommentText.value.trim();
        const commentData = {
            comment: message,
            username: user_data.name,
            user_id: id,
            url: cleaned_url,
            parent_id: null,
            sentiment_score: 2,
            LikeCount: 0,
            DislikeCount: 0,
            profile_pic: user_data.picture,
            created_at: new Date(),
            id:0,		//comment id
        };
        console.log(commentData);

        if (message === '') {
            alert('Please enter a comment');
            return;
        }

       /* try {
            const sentimentResponse = await fetch("http://localhost:5000/api/sentiment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ comment: message })
            });*/

         //   if (sentimentResponse.ok) {
            //    const sentimentData = await sentimentResponse.json();

                try {
                    const new_comment = await fetch("http://localhost:8080/comments", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(commentData),
                    });
                    const comment_obj=await new_comment.json();
                    comment_id=comment_obj.comment_id;
                    commentData.id=comment_id;
                    comments.unshift(commentData);
                    renderComments(comments);
                    console.log(commentData);
                    commentData.value = ''; // Clear the input field
                } catch (error) {
                    console.error('Error posting comment:', error);
                }
           // } else {
            //    console.error('Failed to analyze sentiment');
           // }
      //  } catch (error) {
        //    console.error('Error posting comment:', error);
       // }
    });

    // Sort comments
    sortCommentsButton.addEventListener('click', () => {
        comments.reverse();
        renderComments(comments);
    });

    // Toggle dark mode
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // Enable/disable submit button based on textarea content
    newCommentText.addEventListener('input', () => {
        submitComment.disabled = newCommentText.value.trim() === '';
    });

    // Initial fetch of comments
    fetchComments();
});

