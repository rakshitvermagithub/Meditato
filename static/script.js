const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent

document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('recordBtn');
    const recordBtnText = document.getElementById('recordBtnText');
    const recordingPrompt = document.getElementById('recordingPrompt');
    const savedMantra = document.getElementById('savedMantra');

    if (recordBtn) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            recordBtnText.textContent = "Speech recognition not supported in this browser";
        } else {
            let recognition = null;
            let isRecording = false;
            let finalTranscript = '';

            recordBtn.addEventListener('click', () => {
                if (!isRecording) {
                    startRecording();
                } else {
                    // Just ask it to stop — actual cleanup/save happens in the 'end' handler
                    recordBtnText.textContent = "Processing...";
                    recognition.stop();
                }
            });

            function startRecording() {
                finalTranscript = '';
                savedMantra.textContent = '';
                recordingPrompt.textContent = '';

                recognition = new SpeechRecognitionAPI();
                recognition.lang = 'en-US';
                recognition.continuous = true;     // keep listening across pauses
                recognition.interimResults = true; // lets us show live text as they speak

                // Grammar list isn't supported everywhere, so guard it
                const SpeechGrammarListAPI = window.SpeechGrammarList || window.webkitSpeechGrammarList;
                if (SpeechGrammarListAPI) {
                    const grammar = '#JSGF V1.0; grammar mantra; public <mantra> = Om Namah Shivay | Om | Jay Shri Krishna';
                    const speechRecognitionList = new SpeechGrammarListAPI();
                    speechRecognitionList.addFromString(grammar, 1);
                    recognition.grammars = speechRecognitionList;
                }

                recognition.addEventListener('result', (event) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    // Live preview while they're still talking
                    recordingPrompt.textContent = interimTranscript || finalTranscript;
                });

                recognition.addEventListener('error', (event) => {
                    console.error('Speech recognition error:', event.error);
                });

                recognition.addEventListener('end', () => {
                    isRecording = false;
                    recordBtnText.textContent = "Tap to Start Recording";
                    saveMantra();
                });

                recognition.start();
                isRecording = true;
                recordBtnText.textContent = "Recording... Tap to Stop";
            }

            function saveMantra() {
                const mantra_to_save = finalTranscript.trim();
                recordingPrompt.textContent = '';

                if (!mantra_to_save) {
                    savedMantra.textContent = "No mantra captured — try again.";
                    return;
                }

                savedMantra.textContent = mantra_to_save;

                fetch('/save_mantra', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mantra_recorded: mantra_to_save })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data.message);
                    window.location.href = '/mantra';
                })
                .catch((error) => console.error("Error:", error));
            }
        }
    }

    // Click Event Delegation 
    document.addEventListener('click', function(e) {

        // Deleting saved Mantra (targeting ID instead of class for reliability)
        if (e.target.closest('#deleteMantraBtn')) {
            console.log('Delete button clicked!');
            
            // Find the select dropdown element
            const mantraSelect = document.getElementById('mantraSelect');
            
            // Get the currently selected mantra value
            const mantraToDelete = mantraSelect ? mantraSelect.value : null;
            console.log('Mantra to delete:', mantraToDelete);
            
            // Ensure a valid mantra is selected before proceeding
            if (!mantraToDelete) {
                alert('Please select a mantra to delete.');
                return;
            }
            
            // Confirms with the user before deleting
            if (confirm('Are you sure you want to delete this mantra?')) {

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/mantra';
                
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'mantra_to_delete';
                input.value = mantraToDelete;
                
                form.appendChild(input);
                document.body.appendChild(form);
                form.submit();
            }
        }    
    });

    // Auto Chanting 
    // Setting variables
    const targetPrompt = document.getElementById('targetPrompt');
    const targetCountInput = document.getElementById('targetCountInput');
    const startChantingButton = document.getElementById('startChantingButton');
    const chantingSection = document.getElementById('chantingSection');
    const chantingMantraDisplay = document.getElementById('mantraDisplay')
    
    function normalizeText(text) {
        const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know'];
        const fillerWordsRegex = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'g');

        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')     // Remove punctuation
            .replace(fillerWordsRegex, '') // Remove filler words
            .replace(/\s+/g, ' ')         // Normalize whitespace
            .trim();
    }

    // Get the mantra text which is to be chanted
    const mantraText = chantingMantraDisplay.innerHTML
    const normMantraText = normalizeText(mantraText)
    const wordsText = normMantraText.split(" ");
    const lastWordIndex = wordsText.length - 1;

    console.log(`Chanting Mantra: ${mantraText} and ${normMantraText}`)

    // Global counter to track total mantras across all sessions
    let globalCounter = 0;
    let originalTarget = 0;

    // Function which compares result and updates count
    function updateCountIfMatch(usedRecognition, target, currentCount = 0) {
        if (target) {
            console.log(`Got the target count ${target}, current count: ${currentCount}`);
            
            // Clear any existing event handlers to prevent conflicts
            usedRecognition.onresult = null;
            usedRecognition.onend = null;
            
            usedRecognition.start();
            if (!window.chantingStartTime) {
                window.chantingStartTime = Date.now(); 
            }            
            console.log("started recording");

            // Use the passed currentCount instead of local counter
            let sessionCounter = 0; // Track mantras in this session only

            usedRecognition.onresult = function(event) {
                // Processing new results
                for (i = event.resultIndex; i < event.results.length; i++){
                    
                    // Store the new result
                    const mantraHeard = event.results[i][0].transcript;

                    // Normalize the text eg. radhey krishna radhey krishna
                    const normMantraHeard = normalizeText(mantraHeard);

                    // Get the list of words in the result
                    var wordsHeard = normMantraHeard.split(" ");

                    // Length of the list of words in the result
                    var lengthWordsHeard = wordsHeard.length;
                    
                    var itr = 0;
                    
                    // Iterate through words heard from the user
                    for (j = 0; j < lengthWordsHeard; j++){

                        // Check if they match to the words in the mantra(Text)
                        if (wordsHeard[j] == wordsText[itr]) {

                            // If the matched word is the last one in the mantra(Text)
                            if (itr == lastWordIndex) {
                                // Mantra finished, +1 in the counters
                                sessionCounter++;
                                globalCounter++;
                                console.log(`Session Counter: ${sessionCounter}, Global Counter: ${globalCounter}/${originalTarget}`);
                                itr = 0;
                            }
                            // Else keep iterating through mantra(Text) words
                            else {
                                itr++;
                            }
                        }
                    }

                    // Update display on screen
                    document.getElementById("chantingCounter").innerHTML = globalCounter;

                    // If we reached the original target, stop recognition
                    if (globalCounter == originalTarget) {
                        usedRecognition.stop();

                        let endTime = Date.now();
                        let totalTimeMs = endTime - window.chantingStartTime;
                        
                        // Format milliseconds into Minutes and Seconds
                        let totalSeconds = Math.floor(totalTimeMs / 1000);
                        let minutes = Math.floor(totalSeconds / 60);
                        let seconds = totalSeconds % 60;
                        let timeString = `${minutes}m ${seconds}s`;

                        // Inject data into the modal elements
                        document.getElementById("modalFinalCount").innerText = globalCounter;
                        document.getElementById("modalTimeTaken").innerText = timeString;

                        // Reveal the modal box
                        document.getElementById("completionModal").classList.remove("hidden");
                    }
                }
            }

            usedRecognition.onend = function() {
                console.log(`Session ended. Global count: ${globalCounter}/${originalTarget}`);
                
                // If target not completed
                if (globalCounter < originalTarget) {
                    const remainingCounts = originalTarget - globalCounter;
                    console.log(`Need ${remainingCounts} more mantras. Restarting...`);

                    // Small delay to prevent issues with rapid restart
                    setTimeout(() => {
                        updateCountIfMatch(usedRecognition, remainingCounts, globalCounter);
                    }, 100);
                }
                else {
                    console.log("Recognition ended, Target completed!");
                }
            }        
        }
    }

    // After start button clicked by user in Target Prompt
    if (startChantingButton) {
        startChantingButton.addEventListener('click', () => {

            // get the target of chanting rounds value
            targetCount = parseInt(targetCountInput.value, 10) || 5;

            // Reset global counter for new session
            globalCounter = 0;
            originalTarget = targetCount;
            window.chantingStartTime = null;

            // hide the prompt
            targetPrompt.classList.add('hidden');
            // show the chanting page
            chantingSection.classList.remove('hidden');

            // Ask for audio permissions   
            // Form a speech recognition object
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            // Make recognition continous
            recognition.continuous = true;

            // Variable mantra in grammer to be recognized as selected by the user
            const grammar = '#JSGF V1.0; grammar mantra; public <mantra> = '

            const speechRecognitionList = new SpeechGrammarList();
            speechRecognitionList.addFromString(grammar, 1);

            recognition.grammars = speechRecognitionList;

            // Function to match result and update counter
            updateCountIfMatch(recognition, targetCount);
        });
    }
});