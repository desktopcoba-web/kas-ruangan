
/* =========================================================
   KAS RUANGAN V7
   =========================================================
   V5 BASELINE + V6 + V7

   Storage lama tetap dipertahankan:
   - kasRuangan
   - kasRuanganAnggota
   - kasRuanganIuran
   - kasRuanganIuranAmount

   Backup V5 tetap dapat di-restore.
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const TRANSACTION_KEY = "kasRuangan";
const MEMBER_KEY = "kasRuanganAnggota";
const IURAN_KEY = "kasRuanganIuran";
const IURAN_AMOUNT_KEY = "kasRuanganIuranAmount";

const RESET_BACKUP_KEY = "kasRuanganLastResetBackup";
const LAST_BACKUP_KEY = "kasRuanganLastBackup";


/* =========================================================
   LOAD DATA
   ========================================================= */

function loadJSON(key, fallback) {

    try {

        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        const parsed = JSON.parse(value);

        return parsed ?? fallback;

    } catch (error) {

        console.error("Gagal membaca:", key, error);

        return fallback;
    }
}


function saveJSON(key, data) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

        return true;

    } catch (error) {

        console.error("Gagal menyimpan:", key, error);

        alert(
            "Gagal menyimpan data. " +
            "Kemungkinan penyimpanan browser penuh."
        );

        return false;
    }
}


let transactions =
    loadJSON(TRANSACTION_KEY, []);

let members =
    loadJSON(MEMBER_KEY, []);

let iuranData =
    loadJSON(IURAN_KEY, []);

let iuranAmount =
    Number(
        localStorage.getItem(IURAN_AMOUNT_KEY) || 10000
    );


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function uid(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


function formatRupiah(value) {

    const number = Number(value) || 0;

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(number);
}


function today() {

    const d = new Date();

    const y = d.getFullYear();
    const m = String(
        d.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        d.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${day}`;
}


function formatDate(value) {

    if (!value) return "-";

    const d = new Date(value + "T00:00:00");

    if (Number.isNaN(d.getTime())) {
        return value;
    }

    return d.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getElement(id) {
    return document.getElementById(id);
}


function showToast(message) {

    const toast = getElement("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(
        showToast.timer
    );

    showToast.timer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


/* =========================================================
   NORMALIZE MEMBERS
   ========================================================= */

function normalizeStatus(status) {

    const value =
        String(status ?? "")
            .trim()
            .toLowerCase();

    if (
        !value ||
        value === "aktif" ||
        value === "active"
    ) {
        return "Aktif";
    }

    if (
        value === "tidak aktif" ||
        value === "inactive" ||
        value === "nonaktif"
    ) {
        return "Tidak Aktif";
    }

    return status || "Aktif";
}


function normalizeMembers() {

    members = members.map((m, index) => {

        return {

            id:
                m.id ??
                m.ID ??
                m.memberId ??
                uid("member"),

            number:
                m.number ??
                m.nomor ??
                m.no ??
                m.noAnggota ??
                m.memberNumber ??
                "",

            name:
                m.name ??
                m.nama ??
                m.namaAnggota ??
                "",

            position:
                m.position ??
                m.jabatan ??
                "",

            status:
                normalizeStatus(
                    m.status
                ),

            note:
                m.note ??
                m.keterangan ??
                ""
        };

    });

    saveJSON(
        MEMBER_KEY,
        members
    );
}


/* =========================================================
   NORMALIZE TRANSACTIONS
   ========================================================= */

function normalizeTransactions() {

    let changed = false;

    transactions = transactions.map(t => {

        const item = {
            ...t
        };

        if (!item.id) {
            item.id = uid("trx");
            changed = true;
        }

        if (!item.type) {
            item.type =
                item.jenis ??
                item.transactionType ??
                "Pemasukan";

            changed = true;
        }

        if (!item.date) {
            item.date =
                item.tanggal ??
                today();

            changed = true;
        }

        if (!item.description) {
            item.description =
                item.keterangan ??
                item.description ??
                "-";

            changed = true;
        }

        if (!item.category) {
            item.category =
                item.kategori ??
                (
                    item.type === "Pemasukan"
                        ? "Pemasukan Manual"
                        : "Pengeluaran Umum"
                );

            changed = true;
        }

        const amount =
            Number(
                item.amount ??
                item.jumlah ??
                item.nominal ??
                0
            );

        if (item.amount !== amount) {
            changed = true;
        }

        item.amount = amount;

        if (
            item.type === "pemasukan" ||
            item.type === "INCOME"
        ) {
            item.type = "Pemasukan";
            changed = true;
        }

        if (
            item.type === "pengeluaran" ||
            item.type === "EXPENSE"
        ) {
            item.type = "Pengeluaran";
            changed = true;
        }

        return item;

    });

    if (changed) {
        saveJSON(
            TRANSACTION_KEY,
            transactions
        );
    }
}


/* =========================================================
   NORMALIZE IURAN
   ========================================================= */

function normalizeIuranData() {

    let changed = false;

    iuranData = iuranData.map(item => {

        const r = {
            ...item
        };

        if (!r.id) {
            r.id = uid("iuran");
            changed = true;
        }

        if (!r.memberId) {

            r.memberId =
                r.anggotaId ??
                r.memberID ??
                r.idAnggota ??
                "";

            changed = true;
        }

        if (!r.month) {

            r.month =
                Number(
                    r.bulan ??
                    r.monthNumber ??
                    0
                );

            changed = true;
        }

        if (!r.year) {

            r.year =
                Number(
                    r.tahun ??
                    new Date().getFullYear()
                );

            changed = true;
        }

        if (!r.amount) {

            r.amount =
                Number(
                    r.jumlah ??
                    iuranAmount
                );

            changed = true;
        }

        if (!r.status) {

            r.status =
                r.paid
                    ? "LUNAS"
                    : "LUNAS";

            changed = true;
        }

        return r;

    });

    if (changed) {

        saveJSON(
            IURAN_KEY,
            iuranData
        );
    }
}


/* =========================================================
   ACTIVE MEMBERS
   ========================================================= */

function getActiveMembers() {

    return members.filter(
        m =>
            !m.status ||
            normalizeStatus(m.status) === "Aktif"
    );
}


/* =========================================================
   TRANSACTION TOTALS
   ========================================================= */

function getIncomeTotal() {

    return transactions
        .filter(
            t => t.type === "Pemasukan"
        )
        .reduce(
            (sum, t) =>
                sum + Number(t.amount || 0),
            0
        );
}


function getExpenseTotal() {

    return transactions
        .filter(
            t => t.type === "Pengeluaran"
        )
        .reduce(
            (sum, t) =>
                sum + Number(t.amount || 0),
            0
        );
}


function isIuranTransaction(t) {

    return Boolean(
        t.isIuran ||
        t.source === "Iuran" ||
        t.category === "Iuran" ||
        t.iuranId
    );
}


function getIuranIncomeTotal() {

    return transactions
        .filter(
            t =>
                t.type === "Pemasukan" &&
                isIuranTransaction(t)
        )
        .reduce(
            (sum, t) =>
                sum + Number(t.amount || 0),
            0
        );
}


function getManualIncomeTotal() {

    return getIncomeTotal()
        - getIuranIncomeTotal();
}


function getBalance() {

    return (
        getIncomeTotal() -
        getExpenseTotal()
    );
}


/* =========================================================
   DATE FILTER
   ========================================================= */

function inDateRange(
    date,
    start,
    end
) {

    if (!date) return false;

    if (start && date < start) {
        return false;
    }

    if (end && date > end) {
        return false;
    }

    return true;
}


function getYearFromDate(date) {

    if (!date) return null;

    const match =
        String(date).match(/^(\d{4})-/);

    return match
        ? Number(match[1])
        : null;
}


function getMonthFromDate(date) {

    if (!date) return null;

    const match =
        String(date).match(
            /^\d{4}-(\d{2})-/
        );

    return match
        ? Number(match[1])
        : null;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

const pageTitles = {

    dashboard: [
        "Dashboard",
        "Ringkasan keuangan ruangan"
    ],

    anggota: [
        "Anggota",
        "Data anggota ruangan"
    ],

    pemasukan: [
        "Pemasukan",
        "Catatan pemasukan kas"
    ],

    pengeluaran: [
        "Pengeluaran",
        "Catatan pengeluaran kas"
    ],

    iuran: [
        "Iuran",
        "Pembayaran iuran anggota"
    ],

    laporan: [
        "Laporan",
        "Laporan keuangan"
    ],

    rekap: [
        "Rekap",
        "Rekapitulasi bulanan"
    ],

    grafik: [
        "Grafik",
        "Visualisasi keuangan"
    ],

    keamanan: [
        "Data & Backup",
        "Backup, restore dan reset data"
    ]

};


function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.toggle(
                "active",
                section.id ===
                `page-${page}`
            );

        });

    document
        .querySelectorAll(".menu")
        .forEach(menu => {

            menu.classList.toggle(
                "active",
                menu.dataset.page === page
            );

        });

    const title =
        pageTitles[page] ||
        ["Kas Ruangan", ""];

    if (getElement("pageTitle")) {
        getElement("pageTitle").textContent =
            title[0];
    }

    if (getElement("pageSubtitle")) {
        getElement("pageSubtitle").textContent =
            title[1];
    }

    if (page === "dashboard") {
        renderDashboard();
    }

    if (page === "anggota") {
        renderMembers();
    }

    if (page === "pemasukan") {
        renderIncome();
    }

    if (page === "pengeluaran") {
        renderExpenses();
    }

    if (page === "iuran") {
        renderIuran();
    }

    if (page === "laporan") {
        renderReport();
    }

    if (page === "rekap") {
        renderRecap();
    }

    if (page === "grafik") {
        renderCharts();
    }

    if (page === "keamanan") {
        updateSafetyInfo();
    }
}


document
    .querySelectorAll(".menu")
    .forEach(menu => {

        menu.addEventListener(
            "click",
            () => {

                showPage(
                    menu.dataset.page
                );

            }
        );

    });


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    const now = new Date();

    const month =
        now.getMonth() + 1;

    const year =
        now.getFullYear();

    const monthText =
        now.toLocaleDateString(
            "id-ID",
            {
                month: "long",
                year: "numeric"
            }
        );

    const monthPrefix =
        `${year}-${String(month).padStart(2, "0")}`;

    const monthTransactions =
        transactions.filter(
            t =>
                String(t.date || "")
                    .startsWith(monthPrefix)
        );

    const monthIncome =
        monthTransactions
            .filter(
                t => t.type === "Pemasukan"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount || 0),
                0
            );

    const monthExpense =
        monthTransactions
            .filter(
                t => t.type === "Pengeluaran"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount || 0),
                0
            );

    const summary =
        getIuranSummary(
            month,
            year
        );

    getElement("dashboardBalance")
        .textContent =
        formatRupiah(
            getBalance()
        );

    getElement("dashboardIncome")
        .textContent =
        formatRupiah(
            getIncomeTotal()
        );

    getElement("dashboardExpense")
        .textContent =
        formatRupiah(
            getExpenseTotal()
        );

    getElement("dashboardMembers")
        .textContent =
        getActiveMembers().length;

    getElement("dashboardIuran")
        .textContent =
        formatRupiah(
            summary.paidTotal
        );

    getElement("dashboardUnpaid")
        .textContent =
        summary.unpaidCount;

    getElement("dashboardManualIncome")
        .textContent =
        formatRupiah(
            getManualIncomeTotal()
        );

    getElement("dashboardIuranIncome")
        .textContent =
        formatRupiah(
            getIuranIncomeTotal()
        );

    getElement("dashboardTransactions")
        .textContent =
        transactions.length;

    getElement("dashboardCurrentMonth")
        .textContent =
        monthText;

    getElement("dashboardMonthIncome")
        .textContent =
        formatRupiah(
            monthIncome
        );

    getElement("dashboardMonthExpense")
        .textContent =
        formatRupiah(
            monthExpense
        );

    getElement("dashboardMonthBalance")
        .textContent =
        formatRupiah(
            monthIncome -
            monthExpense
        );

    getElement("dashboardMonthUnpaid")
        .textContent =
        summary.unpaidCount;

    renderDashboardActivity();
}


function renderDashboardActivity() {

    const container =
        getElement("dashboardActivity");

    if (!container) return;

    const list =
        [...transactions]
            .sort(
                (a, b) =>
                    String(b.date || "")
                        .localeCompare(
                            String(a.date || "")
                        )
            )
            .slice(0, 8);

    if (!list.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div>🧾</div>
                Belum ada transaksi.
            </div>
        `;

        return;
    }

    container.innerHTML =
        list.map(t => {

            const income =
                t.type === "Pemasukan";

            return `
                <div class="activity-item">

                    <div class="activity-main">

                        <strong>
                            ${escapeHTML(
                                t.description
                            )}
                        </strong>

                        <small>
                            ${formatDate(t.date)}
                            ·
                            ${escapeHTML(
                                t.category || "-"
                            )}
                        </small>

                    </div>

                    <div class="
                        activity-amount
                        ${income
                            ? "income-text"
                            : "expense-text"}
                    ">
                        ${income ? "+" : "-"}
                        ${formatRupiah(
                            t.amount
                        )}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   MEMBERS
   ========================================================= */

function openMemberModal(id = "") {

    const modal =
        getElement("memberModal");

    const form =
        getElement("memberForm");

    form.reset();

    getElement("memberId")
        .value = "";

    getElement("memberModalTitle")
        .textContent =
        id
            ? "Edit Anggota"
            : "Tambah Anggota";

    if (id) {

        const member =
            members.find(
                m => String(m.id) === String(id)
            );

        if (!member) return;

        getElement("memberId")
            .value = member.id;

        getElement("memberNumber")
            .value = member.number;

        getElement("memberName")
            .value = member.name;

        getElement("memberPosition")
            .value = member.position;

        getElement("memberStatus")
            .value =
            normalizeStatus(
                member.status
            );

        getElement("memberNote")
            .value = member.note;
    }

    modal.classList.add("show");
}


function closeMemberModal() {

    getElement("memberModal")
        .classList.remove("show");
}


function saveMember(event) {

    event.preventDefault();

    const id =
        getElement("memberId").value.trim();

    const number =
        getElement("memberNumber")
            .value.trim();

    const name =
        getElement("memberName")
            .value.trim();

    if (!number || !name) {

        alert(
            "Nomor dan nama anggota wajib diisi."
        );

        return;
    }

    const data = {

        id:
            id ||
            uid("member"),

        number,

        name,

        position:
            getElement("memberPosition")
                .value.trim(),

        status:
            normalizeStatus(
                getElement("memberStatus")
                    .value
            ),

        note:
            getElement("memberNote")
                .value.trim()
    };

    if (id) {

        const index =
            members.findIndex(
                m =>
                    String(m.id) ===
                    String(id)
            );

        if (index >= 0) {
            members[index] = data;
        }

    } else {

        members.push(data);

    }

    saveJSON(
        MEMBER_KEY,
        members
    );

    closeMemberModal();

    renderAll();

    showToast(
        id
            ? "Anggota berhasil diperbarui."
            : "Anggota berhasil ditambahkan."
    );
}


function deleteMember(id) {

    const used =
        transactions.some(
            t =>
                String(t.memberId || "") ===
                String(id)
        ) ||
        iuranData.some(
            r =>
                String(r.memberId || "") ===
                String(id)
        );

    if (used) {

        alert(
            "Anggota tidak dapat dihapus karena masih digunakan dalam data transaksi atau iuran."
        );

        return;
    }

    if (
        !confirm(
            "Hapus anggota ini?"
        )
    ) {
        return;
    }

    members =
        members.filter(
            m =>
                String(m.id) !==
                String(id)
        );

    saveJSON(
        MEMBER_KEY,
        members
    );

    renderAll();

    showToast(
        "Anggota berhasil dihapus."
    );
}


function renderMembers() {

    const table =
        getElement("memberTable");

    if (!table) return;

    const tbody =
        table.querySelector("tbody");

    const search =
        (
            getElement("memberSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    const status =
        getElement("memberStatusFilter")
            ?.value || "";

    const filtered =
        members.filter(m => {

            const text =
                [
                    m.number,
                    m.name,
                    m.position,
                    m.note
                ]
                    .join(" ")
                    .toLowerCase();

            const matchSearch =
                !search ||
                text.includes(search);

            const matchStatus =
                !status ||
                normalizeStatus(m.status) ===
                status;

            return (
                matchSearch &&
                matchStatus
            );
        });

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>👥</div>
                        Data anggota tidak ditemukan.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(
            (m, index) => {

                const active =
                    normalizeStatus(
                        m.status
                    ) === "Aktif";

                return `
                    <tr>

                        <td>${index + 1}</td>

                        <td>
                            ${escapeHTML(
                                m.number
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    m.name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                m.position || "-"
                            )}
                        </td>

                        <td>
                            <span class="
                                badge
                                ${active
                                    ? "badge-success"
                                    : "badge-danger"}
                            ">
                                ${escapeHTML(
                                    normalizeStatus(
                                        m.status
                                    )
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(
                                m.note || "-"
                            )}
                        </td>

                        <td>

                            <button
                                class="table-action edit"
                                onclick="openMemberModal('${m.id}')">
                                ✏️
                            </button>

                            <button
                                class="table-action delete"
                                onclick="deleteMember('${m.id}')">
                                🗑️
                            </button>

                        </td>

                    </tr>
                `;

            }
        ).join("");
}


/* =========================================================
   TRANSACTIONS
   ========================================================= */

function openTransactionModal(
    type,
    id = ""
) {

    const modal =
        getElement("transactionModal");

    const form =
        getElement("transactionForm");

    form.reset();

    getElement("transactionId")
        .value = "";

    getElement("transactionType")
        .value = type;

    getElement("transactionDate")
        .value = today();

    getElement("transactionCategory")
        .value =
        type === "Pemasukan"
            ? "Pemasukan Manual"
            : "Pengeluaran Umum";

    getElement("transactionModalTitle")
        .textContent =
        id
            ? `Edit ${type}`
            : `Tambah ${type}`;

    if (id) {

        const transaction =
            transactions.find(
                t =>
                    String(t.id) ===
                    String(id)
            );

        if (!transaction) return;

        if (isIuranTransaction(transaction)) {

            alert(
                "Transaksi iuran dikelola dari menu Iuran."
            );

            return;
        }

        getElement("transactionId")
            .value = transaction.id;

        getElement("transactionType")
            .value = transaction.type;

        getElement("transactionDate")
            .value = transaction.date;

        getElement("transactionDescription")
            .value =
            transaction.description;

        getElement("transactionCategory")
            .value =
            transaction.category;

        getElement("transactionAmount")
            .value =
            transaction.amount;
    }

    modal.classList.add("show");
}


function closeTransactionModal() {

    getElement("transactionModal")
        .classList.remove("show");
}


function saveTransaction(event) {

    event.preventDefault();

    const id =
        getElement("transactionId")
            .value.trim();

    const type =
        getElement("transactionType")
            .value;

    const date =
        getElement("transactionDate")
            .value;

    const description =
        getElement("transactionDescription")
            .value.trim();

    const category =
        getElement("transactionCategory")
            .value.trim();

    const amount =
        Number(
            getElement("transactionAmount")
                .value
        );

    if (
        !date ||
        !description ||
        !category ||
        amount <= 0
    ) {

        alert(
            "Lengkapi data transaksi dengan benar."
        );

        return;
    }

    const data = {

        id:
            id ||
            uid("trx"),

        type,

        date,

        description,

        category,

        amount

    };

    if (id) {

        const index =
            transactions.findIndex(
                t =>
                    String(t.id) ===
                    String(id)
            );

        if (index >= 0) {
            transactions[index] = {
                ...transactions[index],
                ...data
            };
        }

    } else {

        transactions.push(data);

    }

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    closeTransactionModal();

    renderAll();

    showToast(
        id
            ? "Transaksi berhasil diperbarui."
            : "Transaksi berhasil ditambahkan."
    );
}


function deleteTransaction(id) {

    const transaction =
        transactions.find(
            t =>
                String(t.id) ===
                String(id)
        );

    if (!transaction) return;

    if (
        isIuranTransaction(
            transaction
        )
    ) {

        alert(
            "Transaksi iuran harus dihapus dari menu Iuran."
        );

        return;
    }

    if (
        !confirm(
            "Hapus transaksi ini?"
        )
    ) {
        return;
    }

    transactions =
        transactions.filter(
            t =>
                String(t.id) !==
                String(id)
        );

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    renderAll();

    showToast(
        "Transaksi berhasil dihapus."
    );
}


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function populateCategoryFilters() {

    const incomeSelect =
        getElement(
            "incomeCategoryFilter"
        );

    const expenseSelect =
        getElement(
            "expenseCategoryFilter"
        );

    const incomeCategories =
        [
            ...new Set(
                transactions
                    .filter(
                        t =>
                            t.type ===
                            "Pemasukan"
                    )
                    .map(
                        t =>
                            t.category ||
                            "Tanpa Kategori"
                    )
            )
        ]
            .sort();

    const expenseCategories =
        [
            ...new Set(
                transactions
                    .filter(
                        t =>
                            t.type ===
                            "Pengeluaran"
                    )
                    .map(
                        t =>
                            t.category ||
                            "Tanpa Kategori"
                    )
            )
        ]
            .sort();

    const fill = (
        select,
        categories
    ) => {

        if (!select) return;

        const old =
            select.value;

        select.innerHTML =
            `<option value="">
                Semua Kategori
            </option>`;

        categories.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category;

                option.textContent =
                    category;

                select.appendChild(
                    option
                );
            }
        );

        if (
            categories.includes(old)
        ) {
            select.value = old;
        }
    };

    fill(
        incomeSelect,
        incomeCategories
    );

    fill(
        expenseSelect,
        expenseCategories
    );
}


/* =========================================================
   INCOME
   ========================================================= */

function renderIncome() {

    populateCategoryFilters();

    const tbody =
        getElement("incomeTable")
            ?.querySelector("tbody");

    if (!tbody) return;

    const search =
        (
            getElement("incomeSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    const filter =
        getElement("incomeFilter")
            ?.value || "";

    const start =
        getElement("incomeStartDate")
            ?.value || "";

    const end =
        getElement("incomeEndDate")
            ?.value || "";

    const category =
        getElement(
            "incomeCategoryFilter"
        )?.value || "";

    const filtered =
        transactions
            .filter(
                t =>
                    t.type ===
                    "Pemasukan"
            )
            .filter(t => {

                const text =
                    [
                        t.description,
                        t.category
                    ]
                        .join(" ")
                        .toLowerCase();

                const matchSearch =
                    !search ||
                    text.includes(search);

                const matchFilter =
                    !filter ||
                    (
                        filter === "iuran" &&
                        isIuranTransaction(t)
                    ) ||
                    (
                        filter === "manual" &&
                        !isIuranTransaction(t)
                    );

                const matchDate =
                    inDateRange(
                        t.date,
                        start,
                        end
                    );

                const matchCategory =
                    !category ||
                    t.category ===
                    category;

                return (
                    matchSearch &&
                    matchFilter &&
                    matchDate &&
                    matchCategory
                );
            })
            .sort(
                (a, b) =>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            );

    getElement("incomeTotal")
        .textContent =
        formatRupiah(
            getIncomeTotal()
        );

    getElement("manualIncomeTotal")
        .textContent =
        formatRupiah(
            getManualIncomeTotal()
        );

    getElement("iuranIncomeTotal")
        .textContent =
        formatRupiah(
            getIuranIncomeTotal()
        );

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div>💰</div>
                        Tidak ada pemasukan.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(t => {

            const iuran =
                isIuranTransaction(t);

            return `
                <tr>

                    <td>${formatDate(t.date)}</td>

                    <td>
                        ${escapeHTML(
                            t.description
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            t.category || "-"
                        )}
                    </td>

                    <td>
                        <span class="
                            badge
                            ${iuran
                                ? "badge-blue"
                                : "badge-success"}
                        ">
                            ${iuran
                                ? "Iuran"
                                : "Manual"}
                        </span>
                    </td>

                    <td>
                        <strong>
                            ${formatRupiah(
                                t.amount
                            )}
                        </strong>
                    </td>

                    <td>

                        ${
                            iuran
                                ? `
                                    <span
                                        class="badge badge-blue">
                                        🔒
                                    </span>
                                  `
                                : `
                                    <button
                                        class="table-action edit"
                                        onclick="openTransactionModal(
                                            'Pemasukan',
                                            '${t.id}'
                                        )">
                                        ✏️
                                    </button>

                                    <button
                                        class="table-action delete"
                                        onclick="deleteTransaction(
                                            '${t.id}'
                                        )">
                                        🗑️
                                    </button>
                                  `
                        }

                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   EXPENSE
   ========================================================= */

function renderExpenses() {

    populateCategoryFilters();

    const tbody =
        getElement("expenseTable")
            ?.querySelector("tbody");

    if (!tbody) return;

    const search =
        (
            getElement("expenseSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    const start =
        getElement("expenseStartDate")
            ?.value || "";

    const end =
        getElement("expenseEndDate")
            ?.value || "";

    const category =
        getElement(
            "expenseCategoryFilter"
        )?.value || "";

    const filtered =
        transactions
            .filter(
                t =>
                    t.type ===
                    "Pengeluaran"
            )
            .filter(t => {

                const text =
                    [
                        t.description,
                        t.category
                    ]
                        .join(" ")
                        .toLowerCase();

                return (
                    (!search ||
                        text.includes(search)) &&

                    inDateRange(
                        t.date,
                        start,
                        end
                    ) &&

                    (
                        !category ||
                        t.category ===
                        category
                    )
                );
            })
            .sort(
                (a, b) =>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            );

    const expenseTotal =
        getElement("expenseTotal");

    if (expenseTotal) {

        expenseTotal.textContent =
            formatRupiah(
                getExpenseTotal()
            );

    }

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>💸</div>
                        Tidak ada pengeluaran.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(t => {

            return `
                <tr>

                    <td>${formatDate(t.date)}</td>

                    <td>
                        ${escapeHTML(
                            t.description
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            t.category || "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatRupiah(
                                t.amount
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            class="table-action edit"
                            onclick="openTransactionModal(
                                'Pengeluaran',
                                '${t.id}'
                            )">
                            ✏️
                        </button>

                        <button
                            class="table-action delete"
                            onclick="deleteTransaction(
                                '${t.id}'
                            )">
                            🗑️
                        </button>

                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   IURAN
   ========================================================= */

const monthNames = [

    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"

];


function getIuranPeriod(record) {

    return {

        month:
            Number(
                record?.month ??
                record?.bulan ??
                0
            ),

        year:
            Number(
                record?.year ??
                record?.tahun ??
                0
            )

    };
}


/* ---------------------------------------------------------
   V8: STATUS IURAN DINORMALISASI
   --------------------------------------------------------- */

function getIuranStatus(record) {

    if (!record) {
        return "";
    }

    return String(
        record.status ??
        record.statusIuran ??
        ""
    )
        .trim()
        .toUpperCase();
}


/* ---------------------------------------------------------
   V8: MEMBER ID LEBIH TAHAN DATA LAMA
   --------------------------------------------------------- */

function getIuranMemberId(record) {

    if (!record) {
        return "";
    }

    return String(
        record.memberId ??
        record.memberID ??
        record.anggotaId ??
        record.anggotaID ??
        ""
    );
}


function getIuranRecord(
    memberId,
    month,
    year
) {

    return iuranData.find(
        record => {

            const p =
                getIuranPeriod(
                    record
                );

            return (

                getIuranMemberId(
                    record
                ) ===
                String(memberId) &&

                p.month ===
                Number(month) &&

                p.year ===
                Number(year)

            );

        }
    );
}


function getIuranSummary(
    month,
    year
) {

    const active =
        getActiveMembers();

    let paidTotal = 0;
    let unpaidCount = 0;

    active.forEach(member => {

        const record =
            getIuranRecord(
                member.id,
                month,
                year
            );

        if (
            record &&
            getIuranStatus(record) ===
            "LUNAS"
        ) {

            const recordAmount =
                Number(record.amount);

            paidTotal +=
                Number.isFinite(
                    recordAmount
                ) &&
                recordAmount > 0
                    ? recordAmount
                    : Number(iuranAmount);

        } else {

            unpaidCount++;

        }

    });

    return {

        paidTotal,

        unpaidCount,

        outstanding:
            unpaidCount *
            Number(iuranAmount)

    };
}


function initializeIuranControls() {

    const monthSelect =
        getElement("iuranMonth");

    const yearSelect =
        getElement("iuranYear");

    if (!monthSelect || !yearSelect) {
        return;
    }

    const oldMonth =
        monthSelect.value;

    const oldYear =
        yearSelect.value;

    monthSelect.innerHTML =
        monthNames.map(
            (name, index) =>
                `<option value="${index + 1}">
                    ${name}
                </option>`
        ).join("");

    const currentYear =
        new Date().getFullYear();

    const years = [];

    for (
        let y = currentYear - 3;
        y <= currentYear + 3;
        y++
    ) {
        years.push(y);
    }

    yearSelect.innerHTML =
        years.map(
            y =>
                `<option value="${y}">
                    ${y}
                </option>`
        ).join("");

    const now =
        new Date();

    monthSelect.value =
        monthNames
            .map(
                (_, index) =>
                    String(index + 1)
            )
            .includes(oldMonth)
                ? oldMonth
                : String(
                    now.getMonth() + 1
                );

    yearSelect.value =
        years
            .map(String)
            .includes(oldYear)
                ? oldYear
                : String(
                    now.getFullYear()
                );

    const amountElement =
        getElement("iuranAmount");

    if (amountElement) {

        amountElement.value =
            iuranAmount;

    }
}


function saveIuranAmount() {

    const amountElement =
        getElement("iuranAmount");

    if (!amountElement) {
        return;
    }

    const amount =
        Number(
            amountElement.value
        );

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        alert(
            "Nominal iuran tidak valid."
        );

        return;
    }

    iuranAmount = amount;

    localStorage.setItem(
        IURAN_AMOUNT_KEY,
        String(iuranAmount)
    );

    renderIuran();

    showToast(
        "Nominal iuran berhasil disimpan."
    );
}


function renderIuran() {

    const tbody =
        getElement("iuranTable")
            ?.querySelector("tbody");

    if (!tbody) return;

    const month =
        Number(
            getElement("iuranMonth")
                ?.value
        );

    const year =
        Number(
            getElement("iuranYear")
                ?.value
        );

    const search =
        (
            getElement("iuranSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    const statusFilter =
        getElement("iuranStatusFilter")
            ?.value || "";

    const active =
        getActiveMembers();

    const summary =
        getIuranSummary(
            month,
            year
        );

    const paidTotal =
        getElement("iuranPaidTotal");

    if (paidTotal) {

        paidTotal.textContent =
            formatRupiah(
                summary.paidTotal
            );

    }

    const outstanding =
        getElement("iuranOutstanding");

    if (outstanding) {

        outstanding.textContent =
            formatRupiah(
                summary.outstanding
            );

    }

    const unpaidCount =
        getElement("iuranUnpaidCount");

    if (unpaidCount) {

        unpaidCount.textContent =
            summary.unpaidCount;

    }

    const filtered =
        active.filter(member => {

            const record =
                getIuranRecord(
                    member.id,
                    month,
                    year
                );

            const paid =
                Boolean(
                    record &&
                    getIuranStatus(record) ===
                    "LUNAS"
                );

            const text =
                [
                    member.number,
                    member.name,
                    member.position
                ]
                    .join(" ")
                    .toLowerCase();

            const matchSearch =
                !search ||
                text.includes(search);

            const matchStatus =
                !statusFilter ||
                (
                    statusFilter ===
                    "LUNAS" &&
                    paid
                ) ||
                (
                    statusFilter ===
                    "BELUM" &&
                    !paid
                );

            return (
                matchSearch &&
                matchStatus
            );
        });

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>🪙</div>
                        Tidak ada data.
                    </div>
                </td>
            </tr>
        `;

    } else {

        tbody.innerHTML =
            filtered.map(
                (member, index) => {

                    const record =
                        getIuranRecord(
                            member.id,
                            month,
                            year
                        );

                    const paid =
                        Boolean(
                            record &&
                            getIuranStatus(record) ===
                            "LUNAS"
                        );

                    const amount =
                        record &&
                        Number.isFinite(
                            Number(
                                record.amount
                            )
                        )
                            ? Number(
                                record.amount
                            )
                            : Number(
                                iuranAmount
                            );

                    return `
                        <tr>

                            <td>${index + 1}</td>

                            <td>
                                ${escapeHTML(
                                    member.number
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        member.name
                                    )}
                                </strong>
                            </td>

                            <td>
                                <span class="
                                    badge
                                    ${paid
                                        ? "badge-success"
                                        : "badge-danger"}
                                ">
                                    ${paid
                                        ? "LUNAS"
                                        : "BELUM"}
                                </span>
                            </td>

                            <td>
                                ${formatRupiah(
                                    amount
                                )}
                            </td>

                            <td>
                                ${
                                    record?.paidDate
                                        ? formatDate(
                                            record.paidDate
                                        )
                                        : "-"
                                }
                            </td>

                            <td>

                                ${
                                    paid
                                        ? `
                                            <button
                                                class="table-action delete"
                                                onclick="cancelIuran(
                                                    '${record.id}'
                                                )">
                                                Batalkan
                                            </button>
                                          `
                                        : `
                                            <button
                                                class="btn primary"
                                                onclick="payIuran(
                                                    '${member.id}',
                                                    ${month},
                                                    ${year}
                                                )">
                                                Bayar
                                            </button>
                                          `
                                }

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }

    renderIuranHistory();
}


function payIuran(
    memberId,
    month,
    year
) {

    const member =
        members.find(
            m =>
                String(m.id) ===
                String(memberId)
        );

    if (!member) return;

    if (
        getIuranRecord(
            memberId,
            month,
            year
        )
    ) {

        alert(
            "Iuran periode ini sudah dibayar."
        );

        return;
    }

    const amount =
        Number(iuranAmount);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Nominal iuran harus lebih dari 0."
        );

        return;
    }

    if (
        !confirm(
            `Catat pembayaran iuran ${member.name} untuk ${monthNames[month - 1]} ${year}?`
        )
    ) {
        return;
    }

    const iuranId =
        uid("iuran");

    const transactionId =
        uid("trx");

    const paidDate =
        today();

    const record = {

        id: iuranId,

        memberId,

        month,

        year,

        amount,

        status: "LUNAS",

        paidDate,

        transactionId

    };

    const transaction = {

        id: transactionId,

        type: "Pemasukan",

        date: paidDate,

        description:
            `Iuran ${member.name} - ${monthNames[month - 1]} ${year}`,

        category: "Iuran",

        amount,

        source: "Iuran",

        isIuran: true,

        iuranId,

        memberId

    };

    iuranData.push(record);
    transactions.push(transaction);

    saveJSON(
        IURAN_KEY,
        iuranData
    );

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    renderAll();

    showToast(
        "Pembayaran iuran berhasil dicatat."
    );
}


function cancelIuran(id) {

    const record =
        iuranData.find(
            r =>
                String(r.id) ===
                String(id)
        );

    if (!record) return;

    if (
        !confirm(
            "Batalkan pembayaran iuran ini?"
        )
    ) {
        return;
    }

    const transactionId =
        record.transactionId ||
        record.transaksiId ||
        record.transactionID ||
        record.transaksiID ||
        "";

    iuranData =
        iuranData.filter(
            r =>
                String(r.id) !==
                String(id)
        );

    if (transactionId) {

        transactions =
            transactions.filter(
                t =>
                    String(t.id) !==
                    String(transactionId)
            );

    } else {

        /* -------------------------------------------------
           V8:
           Jika data iuran lama tidak mempunyai transactionId,
           hapus hanya transaksi yang benar-benar teridentifikasi
           sebagai transaksi iuran terkait.
           ------------------------------------------------- */

        const memberId =
            getIuranMemberId(record);

        const period =
            getIuranPeriod(record);

        transactions =
            transactions.filter(t => {

                if (!isIuranTransaction(t)) {
                    return true;
                }

                const sameMember =
                    String(
                        t.memberId ??
                        ""
                    ) ===
                    memberId;

                const transactionDate =
                    String(
                        t.date ||
                        ""
                    );

                const periodPrefix =
                    `${period.year}-${String(
                        period.month
                    ).padStart(2, "0")}`;

                const samePeriod =
                    transactionDate.startsWith(
                        periodPrefix
                    );

                return !(
                    sameMember &&
                    samePeriod
                );

            });

    }

    saveJSON(
        IURAN_KEY,
        iuranData
    );

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    renderAll();

    showToast(
        "Pembayaran iuran dibatalkan."
    );
}


function renderIuranHistory() {

    const tbody =
        getElement(
            "iuranHistoryTable"
        )?.querySelector("tbody");

    if (!tbody) return;

    const list =
        [...iuranData]
            .filter(
                r =>
                    getIuranStatus(r) ===
                    "LUNAS"
            )
            .sort(
                (a, b) =>
                    String(
                        b.paidDate || ""
                    ).localeCompare(
                        String(
                            a.paidDate || ""
                        )
                    )
            );

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>📜</div>
                        Belum ada riwayat iuran.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list.map(record => {

            const member =
                members.find(
                    m =>
                        String(m.id) ===
                        getIuranMemberId(
                            record
                        )
                );

            const p =
                getIuranPeriod(
                    record
                );

            return `
                <tr>

                    <td>
                        ${formatDate(
                            record.paidDate
                        )}
                    </td>

                    <td>
                        ${monthNames[
                            p.month - 1
                        ] || "-"}
                        ${p.year || ""}
                    </td>

                    <td>
                        ${escapeHTML(
                            member?.name ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            record.amount
                        )}
                    </td>

                    <td>
                        <button
                            class="table-action delete"
                            onclick="deleteIuranHistory(
                                '${record.id}'
                            )">
                            🗑️
                        </button>
                    </td>

                </tr>
            `;

        }).join("");
}


function deleteIuranHistory(id) {

    cancelIuran(id);
}


/* =========================================================
   REPORT
   ========================================================= */

function renderReport() {

    const tbody =
        getElement("reportTable")
            ?.querySelector("tbody");

    if (!tbody) return;

    const start =
        getElement("reportStart")
            ?.value || "";

    const end =
        getElement("reportEnd")
            ?.value || "";

    const list =
        transactions
            .filter(
                t =>
                    inDateRange(
                        t.date,
                        start,
                        end
                    )
            )
            .sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );

    const income =
        list
            .filter(
                t =>
                    t.type ===
                    "Pemasukan"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount || 0),
                0
            );

    const expense =
        list
            .filter(
                t =>
                    t.type ===
                    "Pengeluaran"
            )
            .reduce(
                (s, t) =>
                    s + Number(t.amount || 0),
                0
            );

    const reportIncome =
        getElement("reportIncome");

    if (reportIncome) {

        reportIncome.textContent =
            formatRupiah(income);

    }

    const reportExpense =
        getElement("reportExpense");

    if (reportExpense) {

        reportExpense.textContent =
            formatRupiah(expense);

    }

    const reportBalance =
        getElement("reportBalance");

    if (reportBalance) {

        reportBalance.textContent =
            formatRupiah(
                income - expense
            );

    }

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>📄</div>
                        Tidak ada data pada periode tersebut.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list.map(t => {

            return `
                <tr>

                    <td>${formatDate(t.date)}</td>

                    <td>
                        <span class="
                            badge
                            ${
                                t.type ===
                                "Pemasukan"
                                    ? "badge-success"
                                    : "badge-danger"
                            }
                        ">
                            ${escapeHTML(
                                t.type
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            t.description
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            t.category || "-"
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            t.amount
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


function printReport() {

    showPage("laporan");

    renderReport();

    setTimeout(
        () => window.print(),
        100
    );
}


function csvEscape(value) {

    const text =
        String(value ?? "");

    return `"${text.replaceAll(
        '"',
        '""'
    )}"`;
}


function downloadTextFile(
    content,
    filename,
    mime = "text/plain"
) {

    const blob =
        new Blob(
            [content],
            {
                type:
                    `${mime};charset=utf-8`
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(url),
        1000
    );
}


function exportReportCSV() {

    const start =
        getElement("reportStart")
            ?.value || "";

    const end =
        getElement("reportEnd")
            ?.value || "";

    const list =
        transactions
            .filter(
                t =>
                    inDateRange(
                        t.date,
                        start,
                        end
                    )
            )
            .sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );

    const rows = [

        [
            "Tanggal",
            "Jenis",
            "Keterangan",
            "Kategori",
            "Jumlah"
        ],

        ...list.map(
            t => [
                t.date,
                t.type,
                t.description,
                t.category,
                t.amount
            ]
        )

    ];

    const csv =
        rows
            .map(
                row =>
                    row.map(
                        csvEscape
                    ).join(",")
            )
            .join("\n");

    downloadTextFile(
        "\ufeff" + csv,
        `laporan-kas-${today()}.csv`,
        "text/csv"
    );

    showToast(
        "Laporan CSV berhasil dibuat."
    );
}


/* =========================================================
   REKAP
   ========================================================= */

function initializeRecapYears() {

    const select =
        getElement("recapYear");

    if (!select) return;

    const current =
        new Date().getFullYear();

    const old =
        select.value;

    const years = new Set();

    years.add(current);

    transactions.forEach(t => {

        const y =
            getYearFromDate(t.date);

        if (y) years.add(y);

    });

    iuranData.forEach(r => {

        const y =
            Number(
                r.year ??
                r.tahun
            );

        if (y) years.add(y);

    });

    select.innerHTML =
        [...years]
            .sort(
                (a, b) => a - b
            )
            .map(
                y =>
                    `<option value="${y}">
                        ${y}
                    </option>`
            )
            .join("");

    /*
       V8:
       Jangan selalu kembali ke tahun sekarang.
       Pertahankan tahun yang dipilih user jika masih tersedia.
    */

    select.value =
        [...years]
            .map(String)
            .includes(old)
                ? old
                : String(current);
}


function getMonthlyData(year) {

    const data = [];

    for (
        let month = 1;
        month <= 12;
        month++
    ) {

        const prefix =
            `${year}-${String(month).padStart(2, "0")}`;

        const list =
            transactions.filter(
                t =>
                    String(t.date || "")
                        .startsWith(prefix)
            );

        const manual =
            list
                .filter(
                    t =>
                        t.type === "Pemasukan" &&
                        !isIuranTransaction(t)
                )
                .reduce(
                    (s, t) =>
                        s + Number(t.amount || 0),
                    0
                );

        const iuran =
            list
                .filter(
                    t =>
                        t.type === "Pemasukan" &&
                        isIuranTransaction(t)
                )
                .reduce(
                    (s, t) =>
                        s + Number(t.amount || 0),
                    0
                );

        const expense =
            list
                .filter(
                    t =>
                        t.type === "Pengeluaran"
                )
                .reduce(
                    (s, t) =>
                        s + Number(t.amount || 0),
                    0
                );

        data.push({

            month,

            manual,

            iuran,

            income:
                manual + iuran,

            expense,

            balance:
                manual +
                iuran -
                expense,

            transactions:
                list.length

        });

    }

    return data;
}


function renderRecap() {

    initializeRecapYears();

    const year =
        Number(
            getElement("recapYear")
                ?.value
        ) ||
        new Date().getFullYear();

    const tbody =
        getElement("recapTable")
            ?.querySelector("tbody");

    if (!tbody) return;

    const data =
        getMonthlyData(year);

    let manualTotal = 0;
    let iuranTotal = 0;
    let incomeTotal = 0;
    let expenseTotal = 0;
    let transactionTotal = 0;

    tbody.innerHTML =
        data.map(row => {

            manualTotal +=
                row.manual;

            iuranTotal +=
                row.iuran;

            incomeTotal +=
                row.income;

            expenseTotal +=
                row.expense;

            transactionTotal +=
                row.transactions;

            return `
                <tr>

                    <td>
                        <strong>
                            ${monthNames[
                                row.month - 1
                            ]}
                        </strong>
                    </td>

                    <td>
                        ${formatRupiah(
                            row.manual
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            row.iuran
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            row.income
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            row.expense
                        )}
                    </td>

                    <td>
                        ${formatRupiah(
                            row.balance
                        )}
                    </td>

                    <td>
                        ${row.transactions}
                    </td>

                </tr>
            `;

        }).join("");

    const recapManualTotal =
        getElement("recapManualTotal");

    if (recapManualTotal) {

        recapManualTotal.textContent =
            formatRupiah(
                manualTotal
            );

    }

    const recapIuranTotal =
        getElement("recapIuranTotal");

    if (recapIuranTotal) {

        recapIuranTotal.textContent =
            formatRupiah(
                iuranTotal
            );

    }

    const recapIncomeTotal =
        getElement("recapIncomeTotal");

    if (recapIncomeTotal) {

        recapIncomeTotal.textContent =
            formatRupiah(
                incomeTotal
            );

    }

    const recapExpenseTotal =
        getElement("recapExpenseTotal");

    if (recapExpenseTotal) {

        recapExpenseTotal.textContent =
            formatRupiah(
                expenseTotal
            );

    }

    const recapBalanceTotal =
        getElement("recapBalanceTotal");

    if (recapBalanceTotal) {

        recapBalanceTotal.textContent =
            formatRupiah(
                incomeTotal -
                expenseTotal
            );

    }

    const recapTransactionTotal =
        getElement("recapTransactionTotal");

    if (recapTransactionTotal) {

        recapTransactionTotal.textContent =
            transactionTotal;

    }
}


function exportRecapCSV() {

    const year =
        Number(
            getElement("recapYear")
                ?.value
        ) ||
        new Date().getFullYear();

    const data =
        getMonthlyData(year);

    const rows = [

        [
            "Bulan",
            "Pemasukan Manual",
            "Iuran",
            "Total Pemasukan",
            "Pengeluaran",
            "Saldo",
            "Transaksi"
        ],

        ...data.map(
            row => [
                monthNames[
                    row.month - 1
                ],
                row.manual,
                row.iuran,
                row.income,
                row.expense,
                row.balance,
                row.transactions
            ]
        )

    ];

    const csv =
        rows
            .map(
                row =>
                    row.map(
                        csvEscape
                    ).join(",")
            )
            .join("\n");

    downloadTextFile(
        "\ufeff" + csv,
        `rekap-kas-${year}.csv`,
        "text/csv"
    );

    showToast(
        "Rekap CSV berhasil dibuat."
    );
}


/* =========================================================
   SIMPLE CANVAS CHARTS
   ========================================================= */

function setupCanvas(canvas) {

    if (!canvas) return null;

    const ratio =
        window.devicePixelRatio || 1;

    const rect =
        canvas.getBoundingClientRect();

    const width =
        Math.max(
            rect.width,
            300
        );

    const height =
        Math.max(
            rect.height,
            240
        );

    canvas.width =
        width * ratio;

    canvas.height =
        height * ratio;

    const ctx =
        canvas.getContext("2d");

    if (!ctx) return null;

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    return {
        ctx,
        width,
        height
    };
}


function drawBarChart(
    canvas,
    labels,
    series
) {

    const setup =
        setupCanvas(canvas);

    if (!setup) return;

    const {
        ctx,
        width,
        height
    } = setup;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    const left = 55;
    const right = 15;
    const top = 25;
    const bottom = 45;

    const chartWidth =
        width -
        left -
        right;

    const chartHeight =
        height -
        top -
        bottom;

    const max =
        Math.max(
            1,
            ...series.flatMap(
                s =>
                    s.values.map(
                        value =>
                            Number(value) || 0
                    )
            )
        );

    ctx.strokeStyle =
        "#e3efeb";

    ctx.fillStyle =
        "#849398";

    ctx.font =
        "11px Segoe UI";

    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            top +
            chartHeight -
            (
                chartHeight *
                i /
                4
            );

        ctx.beginPath();

        ctx.moveTo(
            left,
            y
        );

        ctx.lineTo(
            width - right,
            y
        );

        ctx.stroke();

        const value =
            max *
            i /
            4;

        ctx.fillText(
            formatCompact(value),
            5,
            y + 4
        );
    }

    const groupWidth =
        labels.length
            ? chartWidth /
                labels.length
            : chartWidth;

    const barWidth =
        Math.min(
            20,
            groupWidth /
                (
                    series.length + 1
                )
        );

    series.forEach(
        (serie, seriesIndex) => {

            ctx.fillStyle =
                serie.color;

            serie.values.forEach(
                (value, index) => {

                    const safeValue =
                        Math.max(
                            0,
                            Number(value) || 0
                        );

                    const barHeight =
                        (
                            safeValue /
                            max
                        ) *
                        chartHeight;

                    const x =
                        left +
                        index *
                        groupWidth +
                        (
                            groupWidth -
                            (
                                barWidth *
                                series.length
                            )
                        ) /
                        2 +
                        seriesIndex *
                        barWidth;

                    const y =
                        top +
                        chartHeight -
                        barHeight;

                    ctx.fillRect(
                        x,
                        y,
                        Math.max(
                            3,
                            barWidth - 3
                        ),
                        barHeight
                    );

                }
            );

        }
    );

    ctx.fillStyle =
        "#849398";

    labels.forEach(
        (label, index) => {

            const x =
                left +
                index *
                groupWidth +
                groupWidth /
                2 -
                10;

            ctx.fillText(
                label,
                x,
                height - 17
            );

        }
    );
}


function formatCompact(value) {

    const n =
        Number(value) || 0;

    if (n >= 1000000000) {

        return (
            (n / 1000000000)
                .toFixed(1) +
            "M"
        );

    }

    if (n >= 1000000) {

        return (
            (n / 1000000)
                .toFixed(1) +
            "jt"
        );

    }

    if (n >= 1000) {

        return (
            (n / 1000)
                .toFixed(0) +
            "rb"
        );

    }

    return String(
        Math.round(n)
    );
}


function drawLineChart(
    canvas,
    labels,
    values
) {

    const setup =
        setupCanvas(canvas);

    if (!setup) return;

    const {
        ctx,
        width,
        height
    } = setup;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    const left = 50;
    const right = 20;
    const top = 20;
    const bottom = 40;

    const chartWidth =
        width -
        left -
        right;

    const chartHeight =
        height -
        top -
        bottom;

    const safeValues =
        values.map(
            value =>
                Number(value) || 0
        );

    const max =
        Math.max(
            1,
            ...safeValues.map(
                Math.abs
            )
        );

    const min =
        Math.min(
            0,
            ...safeValues
        );

    const range =
        Math.max(
            1,
            max - min
        );

    ctx.strokeStyle =
        "#e3efeb";

    ctx.fillStyle =
        "#849398";

    ctx.font =
        "11px Segoe UI";

    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const value =
            min +
            range *
            (
                1 -
                i / 4
            );

        const y =
            top +
            chartHeight *
            i /
            4;

        ctx.beginPath();

        ctx.moveTo(
            left,
            y
        );

        ctx.lineTo(
            width - right,
            y
        );

        ctx.stroke();

        ctx.fillText(
            formatCompact(value),
            4,
            y + 4
        );
    }

    const points =
        safeValues.map(
            (value, index) => {

                const x =
                    left +
                    (
                        index /
                        Math.max(
                            1,
                            safeValues.length - 1
                        )
                    ) *
                    chartWidth;

                const y =
                    top +
                    (
                        1 -
                        (
                            value -
                            min
                        ) /
                        range
                    ) *
                    chartHeight;

                return {
                    x,
                    y
                };
            }
        );

    if (points.length) {

        ctx.beginPath();

        points.forEach(
            (point, index) => {

                if (index === 0) {

                    ctx.moveTo(
                        point.x,
                        point.y
                    );

                } else {

                    ctx.lineTo(
                        point.x,
                        point.y
                    );

                }

            }
        );

        ctx.strokeStyle =
            "#67bfa9";

        ctx.lineWidth = 3;

        ctx.stroke();

        ctx.lineWidth = 1;

        points.forEach(
            point => {

                ctx.beginPath();

                ctx.arc(
                    point.x,
                    point.y,
                    4,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    "#67bfa9";

                ctx.fill();

            }
        );
    }

    ctx.fillStyle =
        "#849398";

    labels.forEach(
        (label, index) => {

            const point =
                points[index];

            if (!point) return;

            ctx.fillText(
                label,
                point.x - 9,
                height - 15
            );

        }
    );
}


function renderCharts() {

    initializeChartYears();

    const year =
        Number(
            getElement("chartYear")
                ?.value
        ) ||
        new Date().getFullYear();

    const data =
        getMonthlyData(year);

    const labels =
        monthNames.map(
            m => m.slice(0, 3)
        );

    drawBarChart(
        getElement(
            "incomeExpenseChart"
        ),
        labels,
        [
            {
                values:
                    data.map(
                        d => d.income
                    ),
                color:
                    "#67bfa9"
            },
            {
                values:
                    data.map(
                        d => d.expense
                    ),
                color:
                    "#e47c7c"
            }
        ]
    );

    drawBarChart(
        getElement(
            "iuranChart"
        ),
        labels,
        [
            {
                values:
                    data.map(
                        d => d.iuran
                    ),
                color:
                    "#8c79d8"
            }
        ]
    );

    let running = 0;

    const balances =
        data.map(
            d => {

                running +=
                    d.balance;

                return running;
            }
        );

    drawLineChart(
        getElement(
            "balanceChart"
        ),
        labels,
        balances
    );
}


function initializeChartYears() {

    const select =
        getElement("chartYear");

    if (!select) return;

    const current =
        new Date().getFullYear();

    const years = new Set();

    years.add(current);

    transactions.forEach(t => {

        const y =
            getYearFromDate(
                t.date
            );

        if (y) years.add(y);

    });

    iuranData.forEach(r => {

        const y =
            Number(
                r.year ??
                r.tahun
            );

        if (y) years.add(y);

    });

    const old =
        select.value;

    select.innerHTML =
        [...years]
            .sort(
                (a, b) =>
                    a - b
            )
            .map(
                y =>
                    `<option value="${y}">
                        ${y}
                    </option>`
            )
            .join("");

    select.value =
        [...years]
            .map(String)
            .includes(old)
            ? old
            : String(current);
}


/* =========================================================
   BACKUP
   ========================================================= */

function createBackupObject() {

    return {

        version: "V8",

        createdAt:
            new Date().toISOString(),

        transactions:
            transactions,

        members:
            members,

        iuranData:
            iuranData,

        iuranAmount:
            iuranAmount

    };
}


function backupData(
    silent = false
) {

    const data =
        createBackupObject();

    const json =
        JSON.stringify(
            data,
            null,
            2
        );

    const date =
        today();

    downloadTextFile(
        json,
        `backup-kas-ruangan-${date}.json`,
        "application/json"
    );

    const info = {

        date:
            new Date().toISOString(),

        filename:
            `backup-kas-ruangan-${date}.json`

    };

    localStorage.setItem(
        LAST_BACKUP_KEY,
        JSON.stringify(info)
    );

    updateSafetyInfo();

    if (!silent) {

        showToast(
            "Backup data berhasil dibuat."
        );
    }

    return true;
}


/* =========================================================
   RESTORE
   ========================================================= */

function restoreData(event) {

    const file =
        event.target.files?.[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload = function () {

        try {

            const data =
                JSON.parse(
                    reader.result
                );

            if (
                !data ||
                typeof data !== "object"
            ) {
                throw new Error(
                    "Format backup tidak valid."
                );
            }

            const hasTransactions =
                Array.isArray(
                    data.transactions
                );

            const hasMembers =
                Array.isArray(
                    data.members
                );

            const hasIuran =
                Array.isArray(
                    data.iuranData
                );

            if (
                !hasTransactions &&
                !hasMembers &&
                !hasIuran
            ) {

                throw new Error(
                    "File tidak berisi data Kas Ruangan."
                );
            }

            if (
                !confirm(
                    "Restore akan mengganti data saat ini. Lanjutkan?"
                )
            ) {
                event.target.value = "";
                return;
            }

            /*
               V8:
               Simpan snapshot data saat ini sebelum restore.
               Jika restore gagal setelah konfirmasi,
               data lama masih dapat dipulihkan melalui
               snapshot reset.
            */

            createResetSnapshot();

            if (hasTransactions) {

                transactions =
                    data.transactions;

            }

            if (hasMembers) {

                members =
                    data.members;

            }

            if (hasIuran) {

                iuranData =
                    data.iuranData;

            }

            if (
                data.iuranAmount !==
                undefined
            ) {

                const restoredAmount =
                    Number(
                        data.iuranAmount
                    );

                if (
                    Number.isFinite(
                        restoredAmount
                    ) &&
                    restoredAmount >= 0
                ) {

                    iuranAmount =
                        restoredAmount;

                }

            }

            /*
               V8:
               Normalisasi dilakukan sebelum save.
            */

            normalizeMembers();
            normalizeTransactions();
            normalizeIuranData();

            saveJSON(
                TRANSACTION_KEY,
                transactions
            );

            saveJSON(
                MEMBER_KEY,
                members
            );

            saveJSON(
                IURAN_KEY,
                iuranData
            );

            localStorage.setItem(
                IURAN_AMOUNT_KEY,
                String(iuranAmount)
            );

            initializeIuranControls();

            renderAll();

            alert(
                `Restore berhasil.\nVersi backup: ${
                    data.version || "lama/V5"
                }`
            );

        } catch (error) {

            console.error(error);

            alert(
                "Restore gagal:\n" +
                error.message
            );

        } finally {

            event.target.value = "";
        }

    };

    reader.onerror = function () {

        alert(
            "File backup tidak dapat dibaca."
        );

        event.target.value = "";
    };

    reader.readAsText(file);
}


/* =========================================================
   RESET SYSTEM
   ========================================================= */

let pendingResetType = null;


function openResetModal(type) {

    pendingResetType = type;

    const modal =
        getElement("resetModal");

    const title =
        getElement("resetTitle");

    const description =
        getElement(
            "resetDescription"
        );

    const descriptions = {

        transactions:
            [
                "Reset Transaksi",
                "Semua transaksi pemasukan dan pengeluaran akan dihapus. Data anggota dan nominal iuran tetap dipertahankan."
            ],

        iuran:
            [
                "Reset Iuran",
                "Semua data pembayaran iuran akan dihapus beserta transaksi pemasukan iuran yang terkait. Data anggota tetap dipertahankan."
            ],

        allExceptMembers:
            [
                "Reset Semua kecuali Anggota",
                "Transaksi dan seluruh data iuran akan dihapus. Data anggota tetap dipertahankan."
            ],

        all:
            [
                "Reset Semua Data",
                "Semua transaksi, iuran, nominal iuran, dan anggota akan dihapus."
            ]

    };

    const selected =
        descriptions[type];

    if (title) {

        title.textContent =
            selected
                ? selected[0]
                : "Reset Data";

    }

    if (description) {

        description.textContent =
            selected
                ? selected[1]
                : "Data akan dihapus.";

    }

    const backupCheckbox =
        getElement(
            "backupBeforeReset"
        );

    if (backupCheckbox) {

        backupCheckbox.checked = true;

    }

    if (modal) {

        modal.classList.add("show");

    }
}


function closeResetModal() {

    pendingResetType = null;

    const modal =
        getElement("resetModal");

    if (modal) {

        modal.classList.remove("show");

    }
}


function createResetSnapshot() {

    const snapshot = {

        version: "V8-RESET",

        createdAt:
            new Date().toISOString(),

        transactions:
            JSON.parse(
                JSON.stringify(
                    transactions
                )
            ),

        members:
            JSON.parse(
                JSON.stringify(
                    members
                )
            ),

        iuranData:
            JSON.parse(
                JSON.stringify(
                    iuranData
                )
            ),

        iuranAmount:
            iuranAmount

    };

    saveJSON(
        RESET_BACKUP_KEY,
        snapshot
    );

    updateSafetyInfo();
}


function confirmReset() {

    if (!pendingResetType) {
        return;
    }

    const type =
        pendingResetType;

    const backupCheckbox =
        getElement(
            "backupBeforeReset"
        );

    const backup =
        backupCheckbox
            ? backupCheckbox.checked
            : true;

    const confirmation =
        confirm(
            "PERINGATAN!\n\n" +
            "Data yang dipilih akan direset.\n" +
            (
                backup
                    ? "Backup otomatis akan dibuat terlebih dahulu."
                    : "Backup otomatis TIDAK dibuat."
            ) +
            "\n\nLanjutkan?"
        );

    if (!confirmation) {
        return;
    }

    if (backup) {

        createResetSnapshot();

        backupData(true);

    } else {

        createResetSnapshot();

    }

    if (
        type ===
        "transactions"
    ) {

        transactions = [];

    } else if (
        type ===
        "iuran"
    ) {

        const iuranTransactionIds =
            new Set(
                iuranData
                    .map(
                        r =>
                            r.transactionId
                    )
                    .filter(Boolean)
            );

        transactions =
            transactions.filter(
                t =>
                    !(
                        isIuranTransaction(t) ||
                        iuranTransactionIds.has(
                            t.id
                        )
                    )
            );

        iuranData = [];

    } else if (
        type ===
        "allExceptMembers"
    ) {

        transactions = [];
        iuranData = [];

    } else if (
        type ===
        "all"
    ) {

        transactions = [];
        iuranData = [];
        members = [];

        iuranAmount = 10000;

        localStorage.setItem(
            IURAN_AMOUNT_KEY,
            String(iuranAmount)
        );
    }

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    saveJSON(
        IURAN_KEY,
        iuranData
    );

    saveJSON(
        MEMBER_KEY,
        members
    );

    closeResetModal();

    initializeIuranControls();

    renderAll();

    updateSafetyInfo();

    showToast(
        "Reset berhasil. Data sebelumnya dapat dikembalikan."
    );
}


function undoLastReset() {

    const snapshot =
        loadJSON(
            RESET_BACKUP_KEY,
            null
        );

    if (!snapshot) {

        alert(
            "Tidak ada snapshot reset yang tersedia."
        );

        return;
    }

    if (
        !confirm(
            "Kembalikan data sebelum reset terakhir?"
        )
    ) {
        return;
    }

    if (
        Array.isArray(
            snapshot.transactions
        )
    ) {

        transactions =
            snapshot.transactions;

    }

    if (
        Array.isArray(
            snapshot.members
        )
    ) {

        members =
            snapshot.members;

    }

    if (
        Array.isArray(
            snapshot.iuranData
        )
    ) {

        iuranData =
            snapshot.iuranData;

    }

    const restoredAmount =
        Number(
            snapshot.iuranAmount
        );

    iuranAmount =
        Number.isFinite(
            restoredAmount
        ) &&
        restoredAmount >= 0
            ? restoredAmount
            : 10000;

    /*
       V8 IMPORTANT:
       Normalisasi dilakukan SEBELUM data disimpan.
       Versi lama melakukan save dahulu lalu normalize,
       sehingga hasil normalisasi bisa hilang ketika reload.
    */

    normalizeMembers();
    normalizeTransactions();
    normalizeIuranData();

    saveJSON(
        TRANSACTION_KEY,
        transactions
    );

    saveJSON(
        MEMBER_KEY,
        members
    );

    saveJSON(
        IURAN_KEY,
        iuranData
    );

    localStorage.setItem(
        IURAN_AMOUNT_KEY,
        String(iuranAmount)
    );

    localStorage.removeItem(
        RESET_BACKUP_KEY
    );

    initializeIuranControls();

    renderAll();

    updateSafetyInfo();

    showToast(
        "Data sebelum reset berhasil dikembalikan."
    );
}


/* =========================================================
   SAFETY INFO
   ========================================================= */

function updateSafetyInfo() {

    const lastBackup =
        loadJSON(
            LAST_BACKUP_KEY,
            null
        );

    const backupInfo =
        getElement(
            "lastBackupInfo"
        );

    if (
        backupInfo &&
        lastBackup?.date
    ) {

        backupInfo.textContent =
            "Backup terakhir: " +
            new Date(
                lastBackup.date
            ).toLocaleString(
                "id-ID"
            );

    } else if (backupInfo) {

        backupInfo.textContent =
            "Belum ada backup.";

    }

    const resetSnapshot =
        loadJSON(
            RESET_BACKUP_KEY,
            null
        );

    const resetInfo =
        getElement(
            "resetBackupInfo"
        );

    const undoButton =
        getElement(
            "undoResetBtn"
        );

    if (
        resetSnapshot?.createdAt
    ) {

        if (resetInfo) {

            resetInfo.textContent =
                "Snapshot tersedia: " +
                new Date(
                    resetSnapshot.createdAt
                ).toLocaleString(
                    "id-ID"
                );
        }

        if (undoButton) {
            undoButton.disabled = false;
        }

    } else {

        if (resetInfo) {

            resetInfo.textContent =
                "Tidak ada snapshot reset.";
        }

        if (undoButton) {
            undoButton.disabled = true;
        }
    }
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {

    /*
       Normalisasi tetap dilakukan seperti V7.
       Tidak mengubah tampilan atau alur render.
    */

    normalizeMembers();
    normalizeTransactions();
    normalizeIuranData();

    renderDashboard();

    renderMembers();

    renderIncome();

    renderExpenses();

    renderIuran();

    renderReport();

    renderRecap();

    renderCharts();

    updateSafetyInfo();
}


/* =========================================================
   CURRENT DATE
   ========================================================= */

function updateCurrentDate() {

    const element =
        getElement("currentDate");

    if (!element) return;

    element.textContent =
        new Date().toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

getElement("addMemberBtn")
    ?.addEventListener(
        "click",
        () =>
            openMemberModal()
    );


getElement("memberForm")
    ?.addEventListener(
        "submit",
        saveMember
    );


getElement("transactionForm")
    ?.addEventListener(
        "submit",
        saveTransaction
    );


getElement("saveIuranAmount")
    ?.addEventListener(
        "click",
        saveIuranAmount
    );


getElement("generateReport")
    ?.addEventListener(
        "click",
        renderReport
    );


getElement("refreshRecap")
    ?.addEventListener(
        "click",
        renderRecap
    );


getElement("backupBtn")
    ?.addEventListener(
        "click",
        backupData
    );


getElement("restoreFile")
    ?.addEventListener(
        "change",
        restoreData
    );


getElement("restoreFilePage")
    ?.addEventListener(
        "change",
        restoreData
    );


getElement("confirmResetBtn")
    ?.addEventListener(
        "click",
        confirmReset
    );


/* MEMBER FILTERS */

[
    "memberSearch",
    "memberStatusFilter"
].forEach(id => {

    getElement(id)
        ?.addEventListener(
            "input",
            renderMembers
        );

    getElement(id)
        ?.addEventListener(
            "change",
            renderMembers
        );

});


/* INCOME FILTERS */

[
    "incomeSearch",
    "incomeFilter",
    "incomeStartDate",
    "incomeEndDate",
    "incomeCategoryFilter"
].forEach(id => {

    getElement(id)
        ?.addEventListener(
            "input",
            renderIncome
        );

    getElement(id)
        ?.addEventListener(
            "change",
            renderIncome
        );

});


/* EXPENSE FILTERS */

[
    "expenseSearch",
    "expenseStartDate",
    "expenseEndDate",
    "expenseCategoryFilter"
].forEach(id => {

    getElement(id)
        ?.addEventListener(
            "input",
            renderExpenses
        );

    getElement(id)
        ?.addEventListener(
            "change",
            renderExpenses
        );

});


/* IURAN FILTERS */

[
    "iuranMonth",
    "iuranYear",
    "iuranSearch",
    "iuranStatusFilter"
].forEach(id => {

    getElement(id)
        ?.addEventListener(
            "input",
            renderIuran
        );

    getElement(id)
        ?.addEventListener(
            "change",
            renderIuran
        );

});


getElement("recapYear")
    ?.addEventListener(
        "change",
        renderRecap
    );


getElement("chartYear")
    ?.addEventListener(
        "change",
        renderCharts
    );


/* =========================================================
   MODAL OUTSIDE CLICK
   ========================================================= */

[
    "memberModal",
    "transactionModal",
    "resetModal"
].forEach(id => {

    getElement(id)
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id === id
                ) {

                    if (
                        id ===
                        "memberModal"
                    ) {
                        closeMemberModal();
                    }

                    if (
                        id ===
                        "transactionModal"
                    ) {
                        closeTransactionModal();
                    }

                    if (
                        id ===
                        "resetModal"
                    ) {
                        closeResetModal();
                    }

                }

            }
        );

});


/* =========================================================
   ESC CLOSE MODAL
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }

        closeMemberModal();
        closeTransactionModal();
        closeResetModal();

    }
);


/* =========================================================
   RESIZE CHART
   ========================================================= */

let chartResizeTimer = null;

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            chartResizeTimer
        );

        chartResizeTimer =
            setTimeout(
                () => {

                    const page =
                        document
                            .querySelector(
                                ".page.active"
                            );

                    /*
                       V8:
                       Grafik hanya dirender ulang
                       jika halaman grafik sedang aktif.
                    */

                    if (
                        page?.id ===
                        "page-grafik"
                    ) {

                        renderCharts();

                    }

                },
                150
            );

    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

normalizeMembers();
normalizeTransactions();
normalizeIuranData();

initializeIuranControls();

initializeRecapYears();

initializeChartYears();

updateCurrentDate();

renderAll();

setInterval(
    updateCurrentDate,
    60000
);

/* =========================================================
   LOGIN V8
   ========================================================= */

const LOGIN_SESSION_KEY = "kasRuanganLoginV8";
const LOGIN_USERNAME_KEY = "kasRuanganUsernameV8";
const LOGIN_PASSWORD_KEY = "kasRuanganPasswordV8";


/* =========================================================
   DATA LOGIN
   ========================================================= */

function getLoginUsername() {

    return localStorage.getItem(
        LOGIN_USERNAME_KEY
    ) || "admin";

}


function getLoginPassword() {

    return localStorage.getItem(
        LOGIN_PASSWORD_KEY
    ) || "admin123";

}


/* =========================================================
   CEK SESSION
   ========================================================= */

function isLoggedIn() {

    return localStorage.getItem(
        LOGIN_SESSION_KEY
    ) === "true";

}


/* =========================================================
   TAMPILKAN LOGIN
   ========================================================= */

function showLoginScreen() {

    const loginScreen =
        document.getElementById(
            "loginScreen"
        );

    if (!loginScreen) {
        return;
    }

    loginScreen.style.display = "flex";

}


/* =========================================================
   SEMBUNYIKAN LOGIN
   ========================================================= */

function hideLoginScreen() {

    const loginScreen =
        document.getElementById(
            "loginScreen"
        );

    if (!loginScreen) {
        return;
    }

    loginScreen.style.display = "none";

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutKasRuangan() {

    if (
        !confirm(
            "Apakah Anda yakin ingin keluar?"
        )
    ) {
        return;
    }

    localStorage.removeItem(
        LOGIN_SESSION_KEY
    );

    showLoginScreen();

    const username =
        document.getElementById(
            "loginUsername"
        );

    const password =
        document.getElementById(
            "loginPassword"
        );

    const error =
        document.getElementById(
            "loginError"
        );

    if (username) {
        username.value = "";
    }

    if (password) {
        password.value = "";
    }

    if (error) {
        error.hidden = true;
    }

}


/* =========================================================
   LOGIN
   ========================================================= */

function initializeLogin() {

    const form =
        document.getElementById(
            "loginForm"
        );

    const toggle =
        document.getElementById(
            "togglePassword"
        );


    /* -----------------------------------------------------
       FORM LOGIN
       ----------------------------------------------------- */

    if (form) {

        form.addEventListener(
            "submit",
            function (e) {

                e.preventDefault();

                const usernameInput =
                    document.getElementById(
                        "loginUsername"
                    );

                const passwordInput =
                    document.getElementById(
                        "loginPassword"
                    );

                const error =
                    document.getElementById(
                        "loginError"
                    );


                if (
                    !usernameInput ||
                    !passwordInput
                ) {
                    return;
                }


                const username =
                    usernameInput.value.trim();

                const password =
                    passwordInput.value;


                /* -----------------------------------------
                   CEK USERNAME & PASSWORD
                   ----------------------------------------- */

                if (
                    username ===
                        getLoginUsername() &&
                    password ===
                        getLoginPassword()
                ) {

                    localStorage.setItem(
                        LOGIN_SESSION_KEY,
                        "true"
                    );

                    hideLoginScreen();


                    if (error) {
                        error.hidden = true;
                    }


                    if (
                        typeof showToast ===
                        "function"
                    ) {

                        showToast(
                            "Login berhasil. Selamat datang!"
                        );

                    }

                } else {

                    if (error) {

                        error.textContent =
                            "Username atau password salah.";

                        error.hidden = false;

                    }


                    passwordInput.value = "";

                    passwordInput.focus();

                }

            }
        );

    }


    /* -----------------------------------------------------
       TOMBOL TAMPIL PASSWORD
       ----------------------------------------------------- */

    if (toggle) {

        toggle.addEventListener(
            "click",
            function () {

                const password =
                    document.getElementById(
                        "loginPassword"
                    );

                if (!password) {
                    return;
                }


                if (
                    password.type ===
                    "password"
                ) {

                    password.type =
                        "text";

                    toggle.textContent =
                        "🙈";

                    toggle.setAttribute(
                        "aria-label",
                        "Sembunyikan password"
                    );

                } else {

                    password.type =
                        "password";

                    toggle.textContent =
                        "👁️";

                    toggle.setAttribute(
                        "aria-label",
                        "Tampilkan password"
                    );

                }

            }
        );

    }


    /* -----------------------------------------------------
       CEK SESSION SAAT APLIKASI DIBUKA
       ----------------------------------------------------- */

    if (isLoggedIn()) {

        hideLoginScreen();

    } else {

        showLoginScreen();

    }

}


/* =========================================================
   PENGATURAN USERNAME & PASSWORD
   ========================================================= */

function initializeLoginSettings() {

    const form =
        document.getElementById(
            "changeLoginForm"
        );

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        function (e) {

            e.preventDefault();


            const usernameInput =
                document.getElementById(
                    "newLoginUsername"
                );

            const oldPasswordInput =
                document.getElementById(
                    "oldLoginPassword"
                );

            const newPasswordInput =
                document.getElementById(
                    "newLoginPassword"
                );

            const confirmPasswordInput =
                document.getElementById(
                    "confirmLoginPassword"
                );


            if (
                !usernameInput ||
                !oldPasswordInput ||
                !newPasswordInput ||
                !confirmPasswordInput
            ) {
                return;
            }


            const username =
                usernameInput.value.trim();

            const oldPassword =
                oldPasswordInput.value;

            const newPassword =
                newPasswordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            /* -----------------------------------------
               USERNAME TIDAK BOLEH KOSONG
               ----------------------------------------- */

            if (!username) {

                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Username tidak boleh kosong."
                    );

                }

                return;
            }


            /* -----------------------------------------
               CEK PASSWORD LAMA
               ----------------------------------------- */

            if (
                oldPassword !==
                getLoginPassword()
            ) {

                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Password lama salah."
                    );

                }

                return;
            }


            /* -----------------------------------------
               PASSWORD MINIMAL
               ----------------------------------------- */

            if (
                newPassword.length < 4
            ) {

                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Password baru minimal 4 karakter."
                    );

                }

                return;
            }


            /* -----------------------------------------
               KONFIRMASI PASSWORD
               ----------------------------------------- */

            if (
                newPassword !==
                confirmPassword
            ) {

                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Konfirmasi password tidak sama."
                    );

                }

                return;
            }


            /* -----------------------------------------
               SIMPAN LOGIN BARU
               ----------------------------------------- */

            localStorage.setItem(
                LOGIN_USERNAME_KEY,
                username
            );

            localStorage.setItem(
                LOGIN_PASSWORD_KEY,
                newPassword
            );


            form.reset();


            if (
                typeof showToast ===
                "function"
            ) {

                showToast(
                    "Username dan password berhasil diubah."
                );

            }

        }
    );

}


/* =========================================================
   JALANKAN LOGIN
   ========================================================= */

initializeLogin();


/* =========================================================
   JALANKAN PENGATURAN LOGIN
   ========================================================= */

initializeLoginSettings();