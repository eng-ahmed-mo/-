document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Structure & Initialization
    let scheduleData = JSON.parse(localStorage.getItem('scheduleData')) || [];

    // MIGRATION: Fix old data
    scheduleData = scheduleData.map(lec => {
        if (lec.time && !lec.startTime) {
            return { ...lec, startTime: lec.time, endTime: lec.time };
        }
        return lec;
    });

    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleBody = document.getElementById('scheduleBody');

    // Modal Elements
    const modalOverlay = document.getElementById('modalOverlay');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Day Mapping
    const dayMap = {
        'Saturday': 'السبت',
        'Sunday': 'الأحد',
        'Monday': 'الاثنين',
        'Tuesday': 'الثلاثاء',
        'Wednesday': 'الأربعاء',
        'Thursday': 'الخميس',
        'Friday': 'الجمعة'
    };

    const daysOrder = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Specific Periods Definitions
    const periods = [
        { id: 1, start: '09:00', end: '09:30' },
        { id: 2, start: '09:30', end: '10:00' },
        { id: 3, start: '10:00', end: '10:30' },
        { id: 4, start: '10:30', end: '11:00' },
        { id: 5, start: '11:00', end: '11:30' },
        { id: 6, start: '11:30', end: '12:00' },
        { id: 7, start: '12:00', end: '12:30' },
        { id: 8, start: '12:30', end: '13:00' }
    ];

    // Color Palette
    const colors = [
        { bg: '#e0e7ff', text: '#4338ca' },
        { bg: '#d1fae5', text: '#065f46' },
        { bg: '#fee2e2', text: '#991b1b' },
        { bg: '#fef3c7', text: '#92400e' },
        { bg: '#e0f2fe', text: '#075985' },
        { bg: '#fce7f3', text: '#9d174d' },
        { bg: '#f3f4f6', text: '#374151' }
    ];

    function getColorForSubject(subject) {
        if (!subject) return colors[6];
        let hash = 0;
        for (let i = 0; i < subject.length; i++) {
            hash = subject.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % (colors.length - 1);
        return colors[index];
    }

    // Modal Logic
    function openModal() {
        modalOverlay.classList.add('active');
        modalOverlay.style.visibility = 'visible';
        modalOverlay.style.opacity = '1';
    }

    function closeModal() {
        modalOverlay.style.opacity = '0';
        modalOverlay.style.visibility = 'hidden';
        setTimeout(() => {
            modalOverlay.classList.remove('active');
            scheduleForm.reset();
            editingLectureId = null;
            const submitBtn = scheduleForm.querySelector('.btn-primary');
            if (submitBtn) submitBtn.textContent = 'إضافة المادة';
        }, 300);
    }

    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Helper: Time Comparison
    function getMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function isTimeInPeriod(lectureStart, periodStart, periodEnd) {
        const lecStart = getMinutes(lectureStart);
        const pStart = getMinutes(periodStart);
        const pEnd = getMinutes(periodEnd);
        return lecStart >= pStart && lecStart < pEnd;
    }

    function calculateSpan(lecture, startPeriodIndex) {
        let span = 1;
        const lecEnd = getMinutes(lecture.endTime);
        for (let i = startPeriodIndex + 1; i < periods.length; i++) {
            const nextPeriodStart = getMinutes(periods[i].start);
            if (lecEnd > nextPeriodStart) {
                span++;
            } else {
                break;
            }
        }
        return span;
    }

    // Helper: Format Time
    function formatTime(time24) {
        if (!time24) return '';
        const [hour, minute] = time24.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'م' : 'ص';
        const h12 = h % 12 || 12;
        return `${h12}:${minute} ${ampm}`;
    }

    // Summary Modal Elements
    const summaryModalOverlay = document.getElementById('summaryModalOverlay');
    const closeSummaryModalBtn = document.getElementById('closeSummaryModalBtn');
    const openSummaryBtn = document.getElementById('openSummaryBtn');
    const summaryContainer = document.getElementById('summaryContainer');

    function openSummaryModal() {
        summaryContainer.innerHTML = '';

        const todayIndex = new Date().getDay();
        const jsDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = jsDays[todayIndex];
        const targetDays = [currentDay];

        targetDays.forEach(day => {
            const dailyLectures = scheduleData.filter(lec => lec.day === day);

            if (dailyLectures.length > 0) {
                dailyLectures.sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));
                const firstOne = dailyLectures[0];
                const endSorted = [...dailyLectures].sort((a, b) => getMinutes(b.endTime) - getMinutes(a.endTime));
                const lastOne = endSorted[0];

                const dayCard = document.createElement('div');
                dayCard.className = 'summary-card-text';

                const subjectList = dailyLectures.map(l => l.subject).join('، ');

                dayCard.innerHTML = `
                    <div class="summary-day-title">${dayMap[day]} (اليوم)</div>
                    <p class="summary-narrative">
                        إجمالي عدد المواد اليوم: <strong>${dailyLectures.length}</strong>.
                        <br>
                        يبدأ الدوام الساعة <span class="badge-time">${formatTime(firstOne.startTime)}</span> 
                        وينتهي الساعة <span class="badge-time">${formatTime(lastOne.endTime)}</span>.
                    </p>
                    <p class="summary-subtext">المواد: ${subjectList}</p>
                `;
                summaryContainer.appendChild(dayCard);
            } else {
                const dayCard = document.createElement('div');
                dayCard.className = 'summary-card-text empty';
                dayCard.innerHTML = `
                   <div class="summary-day-title">(اليوم) ${dayMap[day]}</div>
                   <p class="summary-narrative" style="color: #9ca3af;">
                        لا يوجد محاضرات اليوم. استمتع بيومك! ☕
                   </p>
                `;
                summaryContainer.appendChild(dayCard);
            }
        });

        summaryModalOverlay.classList.add('active');
        summaryModalOverlay.style.visibility = 'visible';
        summaryModalOverlay.style.opacity = '1';
    }

    function closeSummaryModal() {
        summaryModalOverlay.style.opacity = '0';
        summaryModalOverlay.style.visibility = 'hidden';
        setTimeout(() => {
            summaryModalOverlay.classList.remove('active');
        }, 300);
    }

    if (openSummaryBtn) openSummaryBtn.addEventListener('click', openSummaryModal);
    if (closeSummaryModalBtn) closeSummaryModalBtn.addEventListener('click', closeSummaryModal);

    summaryModalOverlay.addEventListener('click', (e) => {
        if (e.target === summaryModalOverlay) closeSummaryModal();
    });

    // View Modal Elements
    const viewModalOverlay = document.getElementById('viewModalOverlay');
    const closeViewModalBtn = document.getElementById('closeViewModalBtn');
    const deleteLectureBtn = document.getElementById('deleteLectureBtn');
    const editLectureBtn = document.getElementById('editLectureBtn');
    let currentLectureId = null;
    let editingLectureId = null;

    function openViewModal(lecture) {
        currentLectureId = lecture.id;
        const color = getColorForSubject(lecture.subject);

        document.getElementById('viewSubjectName').textContent = lecture.subject;
        document.getElementById('viewSubjectName').style.color = color.text;

        const typeText = lecture.type || 'Lecture';
        const typeBadge = document.getElementById('viewClassType');
        typeBadge.textContent = typeText;
        typeBadge.style.backgroundColor = color.bg;
        typeBadge.style.color = color.text;

        document.getElementById('viewDoctorName').textContent = lecture.doctor || 'غير محدد';
        document.getElementById('viewLocation').textContent = lecture.location || 'غير محدد';
        document.getElementById('viewTime').textContent = `${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}`;
        document.getElementById('viewDay').textContent = dayMap[lecture.day];

        viewModalOverlay.classList.add('active');
        viewModalOverlay.style.visibility = 'visible';
        viewModalOverlay.style.opacity = '1';
    }

    function closeViewModal() {
        viewModalOverlay.style.opacity = '0';
        viewModalOverlay.style.visibility = 'hidden';
        setTimeout(() => {
            viewModalOverlay.classList.remove('active');
            currentLectureId = null;
        }, 300);
    }

    if (closeViewModalBtn) closeViewModalBtn.addEventListener('click', closeViewModal);

    viewModalOverlay.addEventListener('click', (e) => {
        if (e.target === viewModalOverlay) closeViewModal();
    });

    // Delete from View Modal
    if (deleteLectureBtn) {
        deleteLectureBtn.addEventListener('click', () => {
            if (currentLectureId) {
                deleteLecture(currentLectureId);
                closeViewModal();
            }
        });
    }

    // Edit from View Modal
    if (editLectureBtn) {
        editLectureBtn.addEventListener('click', () => {
            if (!currentLectureId) return;
            const lecture = scheduleData.find(l => l.id === currentLectureId);
            if (!lecture) return;

            document.getElementById('subjectName').value = lecture.subject || '';
            document.getElementById('doctorName').value = lecture.doctor || '';
            document.getElementById('classType').value = lecture.type || 'Lecture';
            document.getElementById('location').value = lecture.location || '';
            document.getElementById('dayOfWeek').value = lecture.day || '';
            document.getElementById('startTime').value = lecture.startTime || '';
            document.getElementById('endTime').value = lecture.endTime || '';

            editingLectureId = lecture.id;

            const submitBtn = scheduleForm.querySelector('.btn-primary');
            if (submitBtn) submitBtn.textContent = 'حفظ التعديل';

            closeViewModal();
            setTimeout(() => openModal(), 350);
        });
    }

    const mobileAccordion = document.getElementById('mobileAccordion');

    function getCurrentDay() {
        const jsDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return jsDays[new Date().getDay()];
    }

    // Main Render Function
    function renderSchedule() {
        renderDesktopTable();
        renderMobileAccordion();
    }

    function renderDesktopTable() {
        scheduleBody.innerHTML = '';
        daysOrder.forEach(day => {
            const row = document.createElement('tr');
            const dayCell = document.createElement('td');
            dayCell.classList.add('day-head');
            dayCell.textContent = dayMap[day];
            row.appendChild(dayCell);

            let i = 0;
            while (i < periods.length) {
                const period = periods[i];
                let cell = document.createElement('td');
                let span = 1;

                const lecture = scheduleData.find(lec =>
                    lec.day === day && isTimeInPeriod(lec.startTime, period.start, period.end)
                );

                if (lecture) {
                    span = calculateSpan(lecture, i);
                    cell.colSpan = span;
                    const color = getColorForSubject(lecture.subject);
                    const badgeStyle = `font-size: 0.75em; padding: 2px 6px; border-radius: 4px; background-color: rgba(255, 255, 255, 0.6); color: ${color.text}; font-weight: 700; margin-right: 6px; display: inline-block;`;
                    const typeText = lecture.type || 'Lecture';

                    const lectureBox = document.createElement('div');
                    lectureBox.className = 'lecture-box';
                    lectureBox.style.cssText = `background-color: ${color.bg}; color: ${color.text}; border-left: 3px solid ${color.text}; cursor: pointer;`;
                    lectureBox.innerHTML = `
                        <div class="chk-subject">${lecture.subject} <span style="${badgeStyle}">${typeText}</span></div>
                        <div class="chk-info">${lecture.location || ''} ${(lecture.location && lecture.doctor) ? '-' : ''} ${lecture.doctor || ''}</div>
                        <div class="chk-info">${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}</div>
                    `;
                    lectureBox.addEventListener('click', () => openViewModal(lecture));
                    cell.appendChild(lectureBox);
                    i += span;
                    row.appendChild(cell);
                    continue;
                } else {
                    cell.classList.add('empty-slot');
                    row.appendChild(cell);
                    i++;
                }
            }
            scheduleBody.appendChild(row);
        });
    }

    function renderMobileAccordion() {
        if (!mobileAccordion) return;
        mobileAccordion.innerHTML = '';
        const today = getCurrentDay();

        daysOrder.forEach(day => {
            const dayLectures = scheduleData.filter(lec => lec.day === day);
            dayLectures.sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            if (day === today) accordionItem.classList.add('active');

            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerHTML = `
                <h3>${dayMap[day]} ${day === today ? '(اليوم)' : ''}</h3>
                <i class="fa-solid fa-chevron-down"></i>
            `;

            header.addEventListener('click', () => {
                accordionItem.classList.toggle('active');
            });

            const content = document.createElement('div');
            content.className = 'accordion-content';

            if (dayLectures.length > 0) {
                dayLectures.forEach(lec => {
                    const color = getColorForSubject(lec.subject);
                    const card = document.createElement('div');
                    card.className = 'mobile-lec-card';
                    card.style.borderRightColor = color.text;
                    card.innerHTML = `
                        <div class="mobile-lec-header">
                            <span class="mobile-lec-name" style="color: ${color.text}">${lec.subject}</span>
                            <span class="mobile-lec-time">${formatTime(lec.startTime)} - ${formatTime(lec.endTime)}</span>
                        </div>
                        <div class="mobile-lec-details">
                            <i class="fa-solid fa-location-dot"></i> ${lec.location || 'غير محدد'} | 
                            <i class="fa-solid fa-user-doctor"></i> ${lec.doctor || 'غير محدد'}
                        </div>
                    `;
                    card.addEventListener('click', () => openViewModal(lec));
                    content.appendChild(card);
                });
            } else {
                content.innerHTML = '<div class="no-lectures">لا يوجد محاضرات لهذا اليوم</div>';
            }

            accordionItem.appendChild(header);
            accordionItem.appendChild(content);
            mobileAccordion.appendChild(accordionItem);
        });
    }


    // Add / Edit Lecture
    scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const lectureData = {
            subject: document.getElementById('subjectName').value,
            type: document.getElementById('classType').value,
            doctor: document.getElementById('doctorName').value,
            location: document.getElementById('location').value,
            day: document.getElementById('dayOfWeek').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value
        };

        if (editingLectureId) {
            const index = scheduleData.findIndex(l => l.id === editingLectureId);
            if (index !== -1) {
                scheduleData[index] = { ...scheduleData[index], ...lectureData };
            }
            editingLectureId = null;
            const submitBtn = scheduleForm.querySelector('.btn-primary');
            if (submitBtn) submitBtn.textContent = 'إضافة المادة';
        } else {
            lectureData.id = Date.now();
            scheduleData.push(lectureData);
        }

        saveAndRender();
        closeModal();
    });

    // Delete Logic
    const confirmDeleteModalOverlay = document.getElementById('confirmDeleteModalOverlay');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    let lectureIdToDelete = null;

    function deleteLecture(id) {
        lectureIdToDelete = id;
        openConfirmModal();
    }

    function openConfirmModal() {
        confirmDeleteModalOverlay.classList.add('active');
        confirmDeleteModalOverlay.style.visibility = 'visible';
        confirmDeleteModalOverlay.style.opacity = '1';
    }

    function closeConfirmModal() {
        confirmDeleteModalOverlay.style.opacity = '0';
        confirmDeleteModalOverlay.style.visibility = 'hidden';
        setTimeout(() => {
            confirmDeleteModalOverlay.classList.remove('active');
            lectureIdToDelete = null;
        }, 300);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (lectureIdToDelete) {
                scheduleData = scheduleData.filter(lec => lec.id !== lectureIdToDelete);
                saveAndRender();
                closeConfirmModal();
            }
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    }

    confirmDeleteModalOverlay.addEventListener('click', (e) => {
        if (e.target === confirmDeleteModalOverlay) closeConfirmModal();
    });

    function saveAndRender() {
        localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
        renderSchedule();
    }

    renderSchedule();
});
