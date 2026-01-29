"use client";

/**
 * Font Testing Component
 * Use this to verify all Khmer fonts are loading correctly
 * Access at: /font-test (create a page for it)
 */

export default function FontTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-indigo-200">
          <h1 className="text-4xl font-moul text-indigo-900 mb-4">
            ការធ្វើតេស្តពុម្ពអក្សរខ្មែរ
          </h1>
          <p className="font-battambang text-gray-700">
            Khmer Font Testing - Verify all fonts load correctly on all devices
          </p>
        </div>

        {/* H1 - Moul */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-poppins text-sm font-bold text-gray-600 uppercase">
              H1 - Moul Font
            </span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              font-moul
            </code>
          </div>
          <h1 className="text-3xl font-moul text-gray-900 mb-2">
            ប្រព័ន្ធគ្រប់គ្រងសាលារៀន
          </h1>
          <p className="text-sm font-battambang text-gray-600">
            Use for: Page titles, main headings, dashboard titles
          </p>
        </div>

        {/* H2 - Bokor */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-poppins text-sm font-bold text-gray-600 uppercase">
              H2 - Bokor Font
            </span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              font-bokor
            </code>
          </div>
          <h2 className="text-2xl font-bokor text-gray-900 mb-2">
            គ្រប់គ្រងសិស្សានុសិស្ស
          </h2>
          <p className="text-sm font-battambang text-gray-600">
            Use for: Section titles, subtitles, category headers
          </p>
        </div>

        {/* Sidebar - Koulen */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 border-l-4 border-pink-500">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-poppins text-sm font-bold text-white uppercase">
              Sidebar - Koulen Font
            </span>
            <code className="text-xs bg-white/20 text-white px-2 py-1 rounded">
              font-koulen
            </code>
          </div>
          <div className="space-y-2">
            <div className="font-koulen text-lg text-white">ផ្ទាំងគ្រប់គ្រង</div>
            <div className="font-koulen text-lg text-white/90">គ្រប់គ្រងសិស្ស</div>
            <div className="font-koulen text-lg text-white/90">គ្រូបង្រៀន</div>
            <div className="font-koulen text-lg text-white/90">ថ្នាក់រៀន</div>
          </div>
          <p className="text-sm font-battambang text-white/80 mt-4">
            Use for: Navigation menu, sidebar items, button labels
          </p>
        </div>

        {/* Body - Battambang */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-poppins text-sm font-bold text-gray-600 uppercase">
              Body Text - Battambang Font
            </span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              font-battambang
            </code>
          </div>
          <div className="space-y-3">
            <p className="font-battambang text-base text-gray-900">
              ប្រព័ន្ធគ្រប់គ្រងសាលារៀន គឺជាកម្មវិធីដែលត្រូវបានរចនាឡើងដើម្បីជួយគ្រប់គ្រងទិន្នន័យសិស្ស គ្រូបង្រៀន ថ្នាក់រៀន និងមុខវិជ្ជានានា។
            </p>
            <p className="font-battambang text-sm text-gray-700">
              ប្រធានបទសំខាន់ៗ រួមមាន៖ ការគ្រប់គ្រងសិស្ស ការគ្រប់គ្រងពិន្ទុ និងរបាយការណ៍
            </p>
            <p className="font-battambang text-xs text-gray-500">
              សម្រាប់ព័ត៌មានបន្ថែម សូមទាក់ទងមកកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ
            </p>
          </div>
          <p className="text-sm font-battambang text-gray-600 mt-4">
            Use for: Paragraphs, descriptions, tables, forms, all body content
          </p>
        </div>

        {/* Font Weight Variations */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-koulen text-gray-900 mb-6">
            ទម្ងន់ពុម្ពអក្សរ Battambang
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-battambang font-light text-gray-900">
                Light (100) - ពុម្ពស្តើង
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-battambang font-normal text-gray-900">
                Regular (400) - ពុម្ពធម្មតា
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-koulen text-gray-900">
                Bold (700) - ពុម្ពដិត
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-battambang font-black text-gray-900">
                Black (900) - ពុម្ពខ្មៅ
              </p>
            </div>
          </div>
        </div>

        {/* Real-world Examples */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-koulen text-gray-900 mb-6">
            ឧទាហរណ៍ការប្រើប្រាស់
          </h3>

          {/* Card Example */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-4">
            <h1 className="text-2xl font-moul text-indigo-900 mb-2">
              គ្រប់គ្រងសិស្ស
            </h1>
            <h2 className="text-lg font-bokor text-purple-700 mb-4">
              បញ្ជីសិស្សទាំងអស់
            </h2>
            <div className="space-y-2">
              <p className="font-battambang text-sm text-gray-700">
                <strong>ចំនួនសិស្សសរុប៖</strong> ២៥០ នាក់
              </p>
              <p className="font-battambang text-sm text-gray-700">
                <strong>សិស្សប្រុស៖</strong> ១២៥ នាក់
              </p>
              <p className="font-battambang text-sm text-gray-700">
                <strong>សិស្សស្រី៖</strong> ១២៥ នាក់
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-koulen text-blue-900 mb-3">
            ℹ️ សម្គាល់សំខាន់
          </h3>
          <ul className="space-y-2 font-battambang text-sm text-blue-800">
            <li>✅ ពុម្ពអក្សរទាំងអស់មកពី Google Fonts</li>
            <li>✅ ដំណើរការលើគ្រប់ឧបករណ៍ទាំងអស់ (Desktop, Tablet, Mobile)</li>
            <li>✅ ប្រើ Fallback fonts សម្រាប់ Local fonts</li>
            <li>✅ រួមបញ្ចូល Font Weights ពី 100 ដល់ 900</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
