require 'securerandom'

ArchivesSpace::Application.extend_aspace_routes(File.join(File.dirname(__FILE__), "routes.rb"))

Rails.application.config.after_initialize do
  
  # aggregate css & js on each restart - assume it will mean some css or js changes to local files
  plugin_directory = File.expand_path(File.dirname(__FILE__))

  plugin_name = plugin_directory.split("/")[-2]
  AppConfig[:aspace_simple_bulk_edit_precompile_assets_filename] = plugin_name + "-" + SecureRandom.hex
  old_aggregated_files = Dir.glob(File.join(plugin_directory,"assets","#{plugin_name}-*"))
  
  old_aggregated_files.each do |oaf|
    File.delete(oaf) if File.exist?(oaf)
  end

  css_files_to_be_aggregated = Dir[File.join(plugin_directory,"assets","aspace_simple_bulk_edit.css")]
  js_files_to_be_aggregated= Dir[File.join(plugin_directory,"assets","aspace_simple_bulk_edit.js")]
  
  File.open(File.join(plugin_directory,"assets", "#{AppConfig[:aspace_simple_bulk_edit_precompile_assets_filename]}.css"), "w") do |output_file|
    output_file.puts '@charset "utf-8";'
    css_files_to_be_aggregated.each do |input_file|
      File.open(input_file) do |file|
        file.each { |line|
          unless line.include?('@charset')
            output_file.puts line
          end
        }
      end
    end
  end
  
  File.open(File.join(plugin_directory,"assets", "#{AppConfig[:aspace_simple_bulk_edit_precompile_assets_filename]}.js"), "w") do |output_file|
    js_files_to_be_aggregated.each do |input_file|
      File.open(input_file) do |file|
        file.each { |line| output_file.puts line }
      end
    end
  end

  ActionView::PartialRenderer.class_eval do
    alias_method :render_pre_aspace_simple_bulk_edit, :render
    def render(context, options, block)
      result = render_pre_aspace_simple_bulk_edit(context, options, block);

      # Add our specific templates to shared/templates
      if options[:partial] == "shared/templates"
        result += render(context, options.merge(:partial => "aspace_simple_bulk_edit/aspace_simple_bulk_edit_templates"), nil)
      end

      result
    end
  end

end
